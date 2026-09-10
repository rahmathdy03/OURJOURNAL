import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign,
} from "crypto";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export class WebPushError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "WebPushError";
    this.statusCode = statusCode;
  }
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function encodeBase64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function hkdfExtract(salt: Buffer, ikm: Buffer) {
  return createHmac("sha256", salt).update(ikm).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  const chunks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;

  while (Buffer.concat(chunks).length < length) {
    previous = createHmac("sha256", prk)
      .update(Buffer.concat([previous, info, Buffer.from([counter])]))
      .digest();
    chunks.push(previous);
    counter += 1;
  }

  return Buffer.concat(chunks).subarray(0, length);
}

function createVapidJwt(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string
) {
  const publicRaw = decodeBase64Url(publicKey);

  if (publicRaw.length !== 65 || publicRaw[0] !== 4) {
    throw new Error("VAPID public key tidak valid.");
  }

  const x = publicRaw.subarray(1, 33).toString("base64url");
  const y = publicRaw.subarray(33, 65).toString("base64url");

  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x,
      y,
      d: privateKey,
    },
    format: "jwk",
  });

  const header = encodeBase64Url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: subject,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key,
    dsaEncoding: "ieee-p1363",
  });

  return `${unsigned}.${signature.toString("base64url")}`;
}

function encryptPayload(subscription: PushSubscriptionPayload, payload: string) {
  const clientPublicKey = decodeBase64Url(subscription.keys.p256dh);
  const authSecret = decodeBase64Url(subscription.keys.auth);

  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const serverPublicKey = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(clientPublicKey);

  const authPrk = hkdfExtract(authSecret, sharedSecret);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    clientPublicKey,
    serverPublicKey,
  ]);
  const ikm = hkdfExpand(authPrk, keyInfo, 32);

  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const contentEncryptionKey = hkdfExpand(
    prk,
    Buffer.from("Content-Encoding: aes128gcm\0", "utf8"),
    16
  );
  const nonce = hkdfExpand(
    prk,
    Buffer.from("Content-Encoding: nonce\0", "utf8"),
    12
  );

  const plaintext = Buffer.concat([
    Buffer.from(payload, "utf8"),
    Buffer.from([2]),
  ]);

  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);

  return Buffer.concat([
    salt,
    recordSize,
    Buffer.from([serverPublicKey.length]),
    serverPublicKey,
    ciphertext,
  ]);
}

export async function sendWebPush(
  subscription: PushSubscriptionPayload,
  payload: unknown
) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error("Konfigurasi VAPID belum lengkap.");
  }

  const body = encryptPayload(subscription, JSON.stringify(payload));
  const jwt = createVapidJwt(
    subscription.endpoint,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "normal",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new WebPushError(
      `Push gagal (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      response.status
    );
  }
}

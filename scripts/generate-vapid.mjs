import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const jwk = privateKey.export({ format: "jwk" });

if (!jwk.x || !jwk.y || !jwk.d) {
  throw new Error("Gagal membuat VAPID key pair.");
}

const publicKey = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(jwk.x, "base64url"),
  Buffer.from(jwk.y, "base64url"),
]).toString("base64url");

console.log("Salin ke .env.local dan Vercel Environment Variables:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
console.log("VAPID_SUBJECT=mailto:email-kamu@example.com");
console.log("CRON_SECRET=ganti-dengan-random-secret-panjang");

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type ConnectionRow = {
  user_id: string;
  google_email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string | null;
  root_folder_id: string;
  thesis_folder_id: string;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} belum dikonfigurasi.`);
  return value;
}

export function googleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REDIRECT_URI &&
      process.env.GOOGLE_DRIVE_TOKEN_KEY
  );
}

export function googleDriveOAuthConfig() {
  return {
    clientId: env("GOOGLE_DRIVE_CLIENT_ID"),
    clientSecret: env("GOOGLE_DRIVE_CLIENT_SECRET"),
    redirectUri: env("GOOGLE_DRIVE_REDIRECT_URI"),
  };
}

export function googleDriveScopes() {
  return ["openid", "email", DRIVE_SCOPE];
}

function encryptionKey() {
  const raw = Buffer.from(env("GOOGLE_DRIVE_TOKEN_KEY"), "base64url");
  if (raw.length !== 32) throw new Error("GOOGLE_DRIVE_TOKEN_KEY harus 32 byte base64url.");
  return raw;
}

export function encryptDriveSecret(value: string) {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function decryptDriveSecret(value: string) {
  if (!value) return "";
  const [ivText, tagText, cipherText] = value.split(".");
  if (!ivText || !tagText || !cipherText) throw new Error("Token Google Drive tidak valid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(cipherText, "base64url")), decipher.final()]).toString("utf8");
}

export async function getGoogleDriveStatus(userId: string) {
  if (!googleDriveConfigured()) return { configured: false, connected: false, email: "", folderUrl: "" };
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_drive_connections")
    .select("google_email,thesis_folder_id")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    configured: true,
    connected: Boolean(data),
    email: data?.google_email || "",
    folderUrl: data?.thesis_folder_id ? `https://drive.google.com/drive/folders/${data.thesis_folder_id}` : "",
  };
}

async function readConnection(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_drive_connections")
    .select("user_id,google_email,access_token_encrypted,refresh_token_encrypted,expires_at,root_folder_id,thesis_folder_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Google Drive belum terhubung.");
  return data as ConnectionRow;
}

export async function getDriveAccessToken(userId: string) {
  const row = await readConnection(userId);
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (row.access_token_encrypted && expiresAt > Date.now() + 60_000) {
    return { accessToken: decryptDriveSecret(row.access_token_encrypted), connection: row };
  }

  const refreshToken = decryptDriveSecret(row.refresh_token_encrypted);
  if (!refreshToken) throw new Error("Sesi Google Drive perlu dihubungkan ulang.");
  const config = googleDriveOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Gagal memperbarui akses Google Drive. Hubungkan ulang Drive.");

  const expires = new Date(Date.now() + Number(result.expires_in || 3600) * 1000).toISOString();
  const admin = createAdminClient();
  await admin
    .from("google_drive_connections")
    .update({ access_token_encrypted: encryptDriveSecret(result.access_token), expires_at: expires })
    .eq("user_id", userId);
  return { accessToken: String(result.access_token), connection: { ...row, expires_at: expires } };
}

async function driveFetch(accessToken: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Drive gagal (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return response;
}

async function findFolder(accessToken: string, name: string, parentId?: string) {
  const clauses = [
    `name='${name.replace(/'/g, "\\'")}'`,
    `mimeType='${FOLDER_MIME}'`,
    "trashed=false",
  ];
  if (parentId) clauses.push(`'${parentId}' in parents`);
  const params = new URLSearchParams({ q: clauses.join(" and "), fields: "files(id,name)", pageSize: "10" });
  const response = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files?${params}`);
  const result = await response.json();
  return result.files?.[0]?.id ? String(result.files[0].id) : "";
}

async function createFolder(accessToken: string, name: string, parentId?: string) {
  const response = await driveFetch(accessToken, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }),
  });
  const result = await response.json();
  return String(result.id);
}

export async function ensureThesisDriveFolders(userId: string, accessToken?: string) {
  const tokenResult = accessToken ? { accessToken, connection: await readConnection(userId).catch(() => null) } : await getDriveAccessToken(userId);
  const token = tokenResult.accessToken;
  const current = tokenResult.connection as ConnectionRow | null;
  let rootFolderId = current?.root_folder_id || "";
  let thesisFolderId = current?.thesis_folder_id || "";

  if (!rootFolderId) rootFolderId = (await findFolder(token, "OURJOURNAL")) || (await createFolder(token, "OURJOURNAL"));
  if (!thesisFolderId) thesisFolderId = (await findFolder(token, "Skripsi", rootFolderId)) || (await createFolder(token, "Skripsi", rootFolderId));

  const admin = createAdminClient();
  await admin.from("google_drive_connections").update({ root_folder_id: rootFolderId, thesis_folder_id: thesisFolderId }).eq("user_id", userId);
  return { rootFolderId, thesisFolderId, folderUrl: `https://drive.google.com/drive/folders/${thesisFolderId}` };
}

export async function saveGoogleDriveConnection(args: {
  userId: string;
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const admin = createAdminClient();
  const { data: old } = await admin
    .from("google_drive_connections")
    .select("refresh_token_encrypted,root_folder_id,thesis_folder_id")
    .eq("user_id", args.userId)
    .maybeSingle();
  const refreshEncrypted = args.refreshToken
    ? encryptDriveSecret(args.refreshToken)
    : old?.refresh_token_encrypted || "";
  const { error } = await admin.from("google_drive_connections").upsert({
    user_id: args.userId,
    google_email: args.googleEmail,
    access_token_encrypted: encryptDriveSecret(args.accessToken),
    refresh_token_encrypted: refreshEncrypted,
    expires_at: new Date(Date.now() + Math.max(60, args.expiresIn || 3600) * 1000).toISOString(),
    root_folder_id: old?.root_folder_id || "",
    thesis_folder_id: old?.thesis_folder_id || "",
  });
  if (error) throw new Error(error.message);
}

export async function disconnectGoogleDrive(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("google_drive_connections").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function getDriveFile(userId: string, fileId: string) {
  const { accessToken, connection } = await getDriveAccessToken(userId);
  const fields = "id,name,size,mimeType,webViewLink,parents,trashed";
  const response = await driveFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`);
  const file = await response.json();
  if (file.trashed) throw new Error("File Google Drive sudah berada di sampah.");
  return { file, accessToken, connection };
}

export async function createResumableUploadSession(userId: string, file: { name: string; mimeType: string; size: number }) {
  const { accessToken } = await getDriveAccessToken(userId);
  const folders = await ensureThesisDriveFolders(userId, accessToken);
  const response = await driveFetch(accessToken, "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,mimeType,webViewLink,parents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.mimeType || "application/octet-stream",
      "X-Upload-Content-Length": String(file.size),
    },
    body: JSON.stringify({ name: file.name, mimeType: file.mimeType || "application/octet-stream", parents: [folders.thesisFolderId] }),
  });
  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new Error("Google Drive tidak mengembalikan URL upload.");
  return { uploadUrl, folderUrl: folders.folderUrl };
}

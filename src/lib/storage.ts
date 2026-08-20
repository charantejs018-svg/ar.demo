import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Storage abstraction: swap this implementation for an S3-compatible
// client (e.g. AWS SDK v3 + presigned URLs) without touching callers.
// Every function below is the interface the rest of the app depends on.

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

async function ensureRoot() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

export function generateStorageKey(ownerId: string, originalName: string) {
  const ext = path.extname(originalName);
  const random = crypto.randomBytes(16).toString("hex");
  return `${ownerId}/${random}${ext}`;
}

export async function saveFile(storageKey: string, buffer: Buffer) {
  await ensureRoot();
  const fullPath = path.join(UPLOAD_ROOT, storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

export async function readFile(storageKey: string) {
  const fullPath = safeResolve(storageKey);
  return fs.readFile(fullPath);
}

export async function deleteFile(storageKey: string) {
  const fullPath = safeResolve(storageKey);
  await fs.rm(fullPath, { force: true });
}

// Prevent path traversal: resolved path must stay inside UPLOAD_ROOT.
function safeResolve(storageKey: string) {
  const fullPath = path.join(UPLOAD_ROOT, storageKey);
  const normalizedRoot = path.normalize(UPLOAD_ROOT + path.sep);
  const normalizedPath = path.normalize(fullPath);
  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error("Invalid storage key");
  }
  return normalizedPath;
}

import { uuid } from './auth.js';

const RECEIPT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function getReceiptMimeType(filename, providedMime) {
  const normalizedMime = String(providedMime || "").toLowerCase();
  if (RECEIPT_MIME_TYPES.has(normalizedMime)) return normalizedMime;

  const extension = String(filename || "").split('.').pop().toLowerCase();
  if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "pdf") return "application/pdf";
  return "";
}

export function sanitizeFileName(name) {
  return String(name || "comprovante")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "comprovante";
}

export async function putReceipt(env, userId, movementId, fileContent, mimeType, originalName) {
  const safeName = sanitizeFileName(originalName);
  const randomId = uuid();
  const objectKey = `receipts/${userId}/${movementId}/${randomId}-${safeName}`;
  
  await env.RECEIPTS.put(objectKey, fileContent, {
    httpMetadata: {
      contentType: mimeType,
      contentDisposition: 'inline' // Inline allows viewing PDFs/images in browser
    },
    customMetadata: {
      userId,
      originalName
    }
  });
  return objectKey;
}

export async function getReceipt(env, objectKey) {
  if (!objectKey) return null;
  return await env.RECEIPTS.get(objectKey);
}

export async function deleteReceipt(env, objectKey) {
  if (objectKey) {
    await env.RECEIPTS.delete(objectKey);
  }
}

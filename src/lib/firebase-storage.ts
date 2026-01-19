
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import app from "@/lib/firebase";

// Initialize Storage
export const storage = getStorage(app);

// ============================================================
// CONSTANTS
// ============================================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
export const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total
export const MAX_FILES = 5;

// Allowed MIME types mapped to extensions
export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "text/plain": "txt",
  "text/csv": "csv",
};

// ============================================================
// ATTACHMENT TYPE
// ============================================================

export interface Attachment {
  id: string;
  name: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a single file before upload
 */
export function validateFile(file: File): ValidationResult {
  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum is 10MB.`,
    };
  }

  // Check file type
  if (!ALLOWED_TYPES[file.type]) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: PDF, Word, Excel, Images, Text`,
    };
  }

  return { valid: true };
}

/**
 * Validate adding files to existing attachments
 */
export function validateAttachments(
  existingAttachments: Attachment[],
  newFiles: File[],
): ValidationResult {
  // Check file count
  const totalCount = existingAttachments.length + newFiles.length;
  if (totalCount > MAX_FILES) {
    return {
      valid: false,
      error: `Maximum ${MAX_FILES} attachments allowed. You have ${existingAttachments.length}.`,
    };
  }

  // Check total size
  const existingSize = existingAttachments.reduce(
    (sum, att) => sum + att.size,
    0,
  );
  const newSize = newFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSize = existingSize + newSize;

  if (totalSize > MAX_TOTAL_SIZE) {
    const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Total size (${totalMB}MB) exceeds 25MB limit.`,
    };
  }

  // Validate each new file
  for (const file of newFiles) {
    const result = validateFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Sanitize filename for safe storage
 * Removes special characters, path traversal attempts
 */
export function sanitizeFilename(name: string): string {
  return (
    name
      // Remove path traversal attempts
      .replace(/\.\./g, "")
      .replace(/[\/\\]/g, "")
      // Replace special characters with underscores
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      // Remove multiple consecutive underscores
      .replace(/_+/g, "_")
      // Trim underscores from start/end
      .replace(/^_+|_+$/g, "")
      // Limit length
      .slice(0, 100)
  );
}

/**
 * Generate unique ID for attachment
 */
export function generateAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Get file icon based on type
 */
export function getFileIcon(type: string): string {
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
  if (type.includes("image")) return "🖼️";
  if (type.includes("text") || type.includes("csv")) return "📃";
  return "📎";
}

// ============================================================
// STORAGE OPERATIONS
// ============================================================


export async function uploadAttachment(
  file: File,
  campaignId: string,
  onProgress?: (progress: number) => void,
): Promise<Attachment> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate unique ID and sanitize filename
  const id = generateAttachmentId();
  const sanitizedName = sanitizeFilename(file.name);
  const extension = ALLOWED_TYPES[file.type] || "bin";
  const storagePath = `campaign-attachments/${campaignId}/${id}_${sanitizedName}`;

  try {
    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Upload file
    // Note: For progress tracking with larger files, consider using uploadBytesResumable
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get download URL
    const url = await getDownloadURL(snapshot.ref);

    // Return attachment metadata
    return {
      id,
      name: sanitizedName || `file.${extension}`,
      originalName: file.name,
      url,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[Storage] Upload failed:", error);
    throw new Error(
      `Failed to upload ${file.name}: ${error.message || "Unknown error"}`,
    );
  }
}


export async function deleteAttachment(url: string): Promise<void> {
  try {
    // Extract path from URL
    // Firebase Storage URLs contain the path after '/o/' and before '?'
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);

    if (!pathMatch) {
      console.warn("[Storage] Could not extract path from URL:", url);
      return;
    }

    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);

    // Create reference and delete
    const storageRef = ref(storage, decodedPath);
    await deleteObject(storageRef);

    console.log("[Storage] Deleted:", decodedPath);
  } catch (error: any) {
    // If file doesn't exist, that's fine
    if (error.code === "storage/object-not-found") {
      console.log("[Storage] File already deleted or not found");
      return;
    }
    console.error("[Storage] Delete failed:", error);
    throw error;
  }
}

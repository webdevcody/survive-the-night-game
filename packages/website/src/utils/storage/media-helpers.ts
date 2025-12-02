import { getMediaUploadUrlFn } from "~/fn/attachments";
import type { AttachmentType } from "~/db/schema";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface MediaUploadResult {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: AttachmentType;
  previewUrl?: string; // Local blob URL for preview before form submission
}

export interface PendingUpload {
  file: File;
  preview: string;
  id: string;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
  result?: MediaUploadResult;
  error?: string;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export function getMediaType(mimeType: string): AttachmentType | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  return null;
}

export function isAllowedMediaType(mimeType: string): boolean {
  return ALLOWED_MEDIA_TYPES.includes(mimeType);
}

export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const mediaType = getMediaType(file.type);

  if (!mediaType) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: images (jpg, png, gif, webp) and videos (mp4, webm)`,
    };
  }

  const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    return {
      valid: false,
      error: `File too large. Maximum ${mediaType} size is ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function createFilePreview(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeFilePreview(preview: string): void {
  URL.revokeObjectURL(preview);
}

export async function uploadMediaFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<MediaUploadResult> {
  // Get presigned URL from server
  const { presignedUrl, fileKey, attachmentId, attachmentType } =
    await getMediaUploadUrlFn({
      data: {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      },
    });

  // Upload file directly to R2
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        };
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          id: attachmentId,
          fileKey,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          type: attachmentType,
        });
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed: Network error"));
    };

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

export async function uploadMultipleMediaFiles(
  files: File[],
  onFileProgress?: (fileIndex: number, progress: UploadProgress) => void,
  onFileComplete?: (fileIndex: number, result: MediaUploadResult) => void,
  onFileError?: (fileIndex: number, error: string) => void
): Promise<MediaUploadResult[]> {
  const results: MediaUploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadMediaFile(files[i], (progress) => {
        onFileProgress?.(i, progress);
      });
      results.push(result);
      onFileComplete?.(i, result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      onFileError?.(i, errorMessage);
    }
  }

  return results;
}

export function getAcceptedMediaTypes(): Record<string, string[]> {
  return {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "video/mp4": [".mp4"],
    "video/webm": [".webm"],
  };
}

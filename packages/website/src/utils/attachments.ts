import { deleteAttachmentFn } from "~/fn/attachments";
import {
  savePostAttachmentsFn,
  saveCommentAttachmentsFn,
} from "~/fn/attachments";
import type { MediaUploadResult } from "~/utils/storage/media-helpers";

/**
 * Maps MediaUploadResult array to attachment format used by the API
 */
function mapAttachmentsToApiFormat(attachments: MediaUploadResult[]): Array<{
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: "image" | "video";
  position: number;
}> {
  return attachments.map((att, index) => ({
    id: att.id,
    fileKey: att.fileKey,
    fileName: att.fileName,
    fileSize: att.fileSize,
    mimeType: att.mimeType,
    type: att.type,
    position: index,
  }));
}

/**
 * Deletes multiple attachments by their IDs
 */
async function deleteAttachments(attachmentIds: string[]): Promise<void> {
  if (attachmentIds.length > 0) {
    await Promise.all(
      attachmentIds.map((id) => deleteAttachmentFn({ data: { id } }))
    );
  }
}

/**
 * Options for updating attachments
 */
export interface UpdateAttachmentsOptions {
  newAttachments?: MediaUploadResult[];
  deletedAttachmentIds?: string[];
}

/**
 * Generic function to update attachments with a callback for saving
 */
async function updateAttachments(
  options: UpdateAttachmentsOptions,
  saveAttachments: (
    attachments: ReturnType<typeof mapAttachmentsToApiFormat>
  ) => Promise<void>
): Promise<void> {
  const { newAttachments, deletedAttachmentIds } = options;

  // Delete removed attachments
  if (deletedAttachmentIds && deletedAttachmentIds.length > 0) {
    await deleteAttachments(deletedAttachmentIds);
  }

  // Add new attachments
  if (newAttachments && newAttachments.length > 0) {
    await saveAttachments(mapAttachmentsToApiFormat(newAttachments));
  }
}

/**
 * Updates attachments for a post
 */
export async function updatePostAttachments(
  postId: string,
  options: UpdateAttachmentsOptions
): Promise<void> {
  await updateAttachments(options, async (attachments) => {
    await savePostAttachmentsFn({
      data: {
        postId,
        attachments,
      },
    });
  });
}

/**
 * Updates attachments for a comment
 */
export async function updateCommentAttachments(
  commentId: string,
  options: UpdateAttachmentsOptions
): Promise<void> {
  await updateAttachments(options, async (attachments) => {
    await saveCommentAttachmentsFn({
      data: {
        commentId,
        attachments,
      },
    });
  });
}

/**
 * useMediaUpload.ts
 *
 * Hook for uploading chat media (images & videos) to Supabase Storage.
 *
 * Image pipeline:
 *   raw file → browser-image-compression (max 1280×1280, <1 MB) → upload
 *
 * Video pipeline:
 *   raw file → metadata validation (duration ≤5s, size ≤30 MB) → upload
 *
 * Exposes a `progress` value (0-100) driven by XMLHttpRequest onprogress,
 * since the Supabase JS SDK does not natively expose upload progress.
 */

import { useCallback, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../utils/supabase';
import type { MessageType } from '../types/chat';
import { uploadChatMedia } from '../lib/chatMediaUpload';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKET = 'chat-media';

/** Maximum image output dimensions after compression. */
const IMAGE_MAX_PX = 1280;
/** Maximum image file size after compression (bytes). */
const IMAGE_MAX_BYTES = 1_000_000; // 1 MB

/** Maximum video file size (bytes). */
const VIDEO_MAX_BYTES = 30 * 1024 * 1024; // 30 MB
/** Maximum video duration (seconds). */
const VIDEO_MAX_DURATION_S = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadResult {
  /** Public URL of the uploaded file in Supabase Storage. */
  publicUrl: string;
  /** The message type inferred from the file MIME type. */
  type: Extract<MessageType, 'IMAGE' | 'VIDEO'>;
}

export interface UseMediaUploadReturn {
  /** Upload a file. Throws on validation or upload failure. */
  upload: (file: File, senderId: string) => Promise<UploadResult>;
  /** Upload progress 0-100. Null when idle. */
  progress: number | null;
  /** True while uploading. */
  isUploading: boolean;
  /** Reset state (progress, error). */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Video metadata reader
// ---------------------------------------------------------------------------

/**
 * Reads a video file's duration via the HTMLVideoElement API.
 * Resolves with duration in seconds; rejects if the metadata cannot be loaded.
 */
function readVideoDuration(file: File): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc metadata video. Vui lòng thử lại với file khác.'));
    };

    video.src = url;
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMediaUpload(): UseMediaUploadReturn {
  const [progress, setProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const reset = useCallback(() => {
    setProgress(null);
    setIsUploading(false);
  }, []);

  const upload = useCallback(async (file: File, senderId: string): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);

    try {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        throw new Error('Chỉ hỗ trợ file ảnh và video.');
      }

      let blobToUpload: Blob;
      let mimeType: string;
      let ext: string;
      let type: Extract<MessageType, 'IMAGE' | 'VIDEO'>;

      // -----------------------------------------------------------------------
      // IMAGE: compress
      // -----------------------------------------------------------------------
      if (isImage) {
        type = 'IMAGE';

        // Use WEBP output for best ratio (falls back to original format if unsupported)
        const compressed = await imageCompression(file, {
          maxSizeMB: IMAGE_MAX_BYTES / 1_000_000,
          maxWidthOrHeight: IMAGE_MAX_PX,
          useWebWorker: true,
          fileType: 'image/webp',
          // Report compression progress in the first 0-50% window
          onProgress: (p) => setProgress(Math.round(p * 0.5)),
        });

        blobToUpload = compressed;
        mimeType = compressed.type || 'image/webp';
        ext = mimeType === 'image/webp' ? 'webp' : mimeType.split('/')[1] ?? 'jpg';
      }
      // -----------------------------------------------------------------------
      // VIDEO: validate only, no transcoding
      // -----------------------------------------------------------------------
      else {
        type = 'VIDEO';

        if (file.size > VIDEO_MAX_BYTES) {
          throw new Error(
            `Video quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Giới hạn là 30 MB.`,
          );
        }

        const duration = await readVideoDuration(file);
        if (duration > VIDEO_MAX_DURATION_S) {
          throw new Error(
            `Video dài quá ${VIDEO_MAX_DURATION_S} giây (${duration.toFixed(1)}s). Vui lòng cắt ngắn lại.`,
          );
        }

        blobToUpload = file;
        mimeType = file.type;
        ext = mimeType.split('/')[1]?.split(';')[0] ?? 'mp4';
      }

      // -----------------------------------------------------------------------
      // Build storage path: {senderId}/{timestamp}.{ext}
      // -----------------------------------------------------------------------
      const path = `${senderId}/${crypto.randomUUID()}.${ext}`;

      // Upload in the 50-100% window (images start at 50% after compression)
      const progressOffset = isImage ? 50 : 0;
      const progressScale = isImage ? 0.5 : 1;

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || session.user.id !== senderId) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để gửi ảnh.');
      }
      await uploadChatMedia({
        url: import.meta.env.VITE_SUPABASE_URL,
        apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        token: session.access_token,
      }, path, blobToUpload.type ? blobToUpload : new Blob([blobToUpload], { type: mimeType }), (pct) => {
        setProgress(progressOffset + Math.round(pct * progressScale));
      });

      // -----------------------------------------------------------------------
      // Get the public URL
      // -----------------------------------------------------------------------
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

      return { publicUrl: urlData.publicUrl, type };
    } finally {
      setIsUploading(false);
      // Keep progress at 100 briefly so the progress bar completes visually
      setTimeout(() => setProgress(null), 600);
    }
  }, []);

  return { upload, progress, isUploading, reset };
}

export interface UploadCredentials { url: string; apiKey: string; token: string }

/** One Authorization header only: XHR appends values instead of replacing them. */
export function uploadChatMedia(
  credentials: UploadCredentials, path: string, blob: Blob, onProgress: (percent: number) => void,
  createRequest: () => XMLHttpRequest = () => new XMLHttpRequest(),
): Promise<void> {
  if (!credentials.token) return Promise.reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để gửi ảnh.'));
  return new Promise((resolve, reject) => {
    const xhr = createRequest();
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    xhr.open('POST', `${credentials.url.replace(/\/$/, '')}/storage/v1/object/chat-media/${encodedPath}`);
    xhr.setRequestHeader('apikey', credentials.apiKey);
    xhr.setRequestHeader('Authorization', `Bearer ${credentials.token}`);
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.timeout = 120000;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); return; }
      if (xhr.status === 401 || xhr.status === 403) {
        reject(new Error('Không thể xác thực tải ảnh. Hãy đăng nhập lại rồi thử gửi.')); return;
      }
      let message = `Không tải được tệp (HTTP ${xhr.status}). Vui lòng thử lại.`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (typeof body.message === 'string') message = body.message;
      } catch { /* Keep the readable HTTP fallback. */ }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Mất kết nối khi tải tệp. Vui lòng thử lại.'));
    xhr.ontimeout = () => reject(new Error('Tải tệp quá lâu. Hãy kiểm tra mạng và thử lại.'));
    xhr.onabort = () => reject(new Error('Đã hủy tải tệp.'));
    xhr.send(blob);
  });
}

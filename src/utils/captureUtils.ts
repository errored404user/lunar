import type { CaptureItem, RunningInstance } from '../types/lunar';
import { sanitizeCaptureTitle } from './robloxApiHelpers';

const MAX_CAPTURE_WIDTH = 1440;
const ALLOWED_UPLOAD_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export interface CapturedImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Captures a real frame from the user's screen, browser tab, or Roblox Player window
 * using the browser's Screen Capture API (getDisplayMedia) -> <canvas>.
 */
export async function captureScreenFrame(): Promise<CapturedImageResult> {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
    throw new Error('Screen capture is not supported in this browser environment.');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 15, max: 30 } },
    audio: false,
  });

  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Screen capture timed out.')), 6000);
      video.onloadeddata = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Could not read video frame from display capture.'));
      };
      video.play().catch(() => {
        // Play may resolve automatically once metadata loads
      });
    });

    // Wait one animation frame so pixels are fully painted
    await new Promise<void>((r) => window.requestAnimationFrame(() => r()));

    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    const scale = srcW > MAX_CAPTURE_WIDTH ? MAX_CAPTURE_WIDTH / srcW : 1;
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return { dataUrl, width, height };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Validates and compresses a real uploaded screenshot file (e.g. from Pictures/Roblox)
 * into a safe, storage-friendly data URL with exact dimensions.
 */
export async function processUploadedScreenshot(
  file: File,
): Promise<CapturedImageResult & { title: string }> {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    throw new Error(`Unsupported image format "${file.type || 'unknown'}". Use PNG, JPG, or WebP.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image exceeds 15 MB limit.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const img = await loadImageElement(rawDataUrl);
  const srcW = img.naturalWidth || 1280;
  const srcH = img.naturalHeight || 720;
  const scale = srcW > MAX_CAPTURE_WIDTH ? MAX_CAPTURE_WIDTH / srcW : 1;
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      dataUrl: rawDataUrl,
      width: srcW,
      height: srcH,
      title: sanitizeCaptureTitle(file.name.replace(/\.[^.]+$/, ''), 'Uploaded Screenshot'),
    };
  }
  ctx.drawImage(img, 0, 0, width, height);
  const mime = file.type === 'image/png' && width * height <= 921600 ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mime, 0.88);
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  return {
    dataUrl,
    width,
    height,
    title: sanitizeCaptureTitle(baseName, 'Uploaded Screenshot'),
  };
}

/**
 * Renders a crisp 16:9 (1280x720) downloadable snapshot of a running Roblox instance
 * with a clean Lunar Client HUD telemetry overlay. Falls back safely if CORS prevents pixel readback.
 */
export async function composeInstanceSnapshot(
  inst: RunningInstance,
  preferredImageUrl: string,
): Promise<{ thumbnail: string; resolution: string }> {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { thumbnail: preferredImageUrl, resolution: `${width}×${height}` };
  }

  // Deep Lunar dark backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0E1220');
  bgGrad.addColorStop(1, '#1A2036');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  let drewCover = false;
  if (preferredImageUrl) {
    try {
      const img = await loadImageElement(preferredImageUrl, true);
      drawCoverImage(ctx, img, width, height);
      drewCover = true;
    } catch {
      // If cross-origin Roblox CDN blocks anonymous canvas readback, fall back directly to the 16:9 image URL
      return {
        thumbnail: preferredImageUrl,
        resolution: '1280×720',
      };
    }
  }

  if (!drewCover) {
    ctx.fillStyle = 'rgba(110, 150, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.28, 220, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle bottom cinematic gradient
  const overlayGrad = ctx.createLinearGradient(0, height * 0.58, 0, height);
  overlayGrad.addColorStop(0, 'rgba(10, 12, 18, 0)');
  overlayGrad.addColorStop(1, 'rgba(10, 12, 18, 0.88)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, height * 0.58, width, height * 0.42);

  // Subtle Lunar HUD stamp bottom-left
  ctx.fillStyle = 'rgba(15, 18, 28, 0.82)';
  roundRect(ctx, 28, height - 84, 420, 56, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 20px Inter, system-ui, sans-serif';
  ctx.fillText(inst.gameTitle.slice(0, 28), 46, height - 56);

  ctx.fillStyle = '#93B4FF';
  ctx.font = '600 13px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(
    `@${inst.accountUsername}  ·  ${inst.liveFps} FPS  ·  ${inst.pingMs} ms`,
    46,
    height - 37,
  );

  // Top-right timestamp stamp (dynamically measured so AM/PM never clips)
  const stamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const pillText = `LUNAR · ${inst.liveFps} FPS · ${stamp}`;
  ctx.font = '700 13px ui-monospace, SFMono-Regular, monospace';
  const pillW = Math.ceil(ctx.measureText(pillText).width) + 28;
  const pillX = width - pillW - 24;
  ctx.fillStyle = 'rgba(15, 18, 28, 0.82)';
  roundRect(ctx, pillX, 24, pillW, 34, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#4ADE80';
  ctx.fillText(pillText, pillX + 14, 46);

  try {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return { thumbnail: dataUrl, resolution: `${width}×${height}` };
  } catch {
    return { thumbnail: preferredImageUrl, resolution: '1280×720' };
  }
}

/**
 * Triggers a clean browser file download for any capture item.
 */
export async function downloadCaptureFile(capture: CaptureItem): Promise<void> {
  const safeName =
    capture.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'lunar-capture';
  const ext = capture.thumbnail.startsWith('data:image/jpeg') ? 'jpg' : 'png';

  if (capture.thumbnail.startsWith('data:image/')) {
    triggerAnchorDownload(capture.thumbnail, `${safeName}.${ext}`);
    return;
  }

  try {
    const res = await fetch(capture.thumbnail);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(objUrl, `${safeName}.${ext}`);
    window.setTimeout(() => URL.revokeObjectURL(objUrl), 2500);
  } catch {
    triggerAnchorDownload(capture.thumbnail, `${safeName}.${ext}`);
  }
}

/**
 * Copies a capture image to the system clipboard as PNG when supported.
 */
export async function copyCaptureToClipboard(capture: CaptureItem): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    const res = await fetch(capture.thumbnail);
    const rawBlob = await res.blob();
    let pngBlob = rawBlob;
    if (rawBlob.type !== 'image/png') {
      const objUrl = URL.createObjectURL(rawBlob);
      try {
        const img = await loadImageElement(objUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1280;
        canvas.height = img.naturalHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const converted = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png'),
          );
          if (converted) pngBlob = converted;
        }
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    return true;
  } catch {
    return false;
  }
}

function triggerAnchorDownload(href: string, filename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function loadImageElement(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin && !src.startsWith('data:') && !src.startsWith('/')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
): void {
  const srcW = img.naturalWidth || targetW;
  const srcH = img.naturalHeight || targetH;
  const scale = Math.max(targetW / srcW, targetH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const offsetX = (targetW - drawW) / 2;
  const offsetY = (targetH - drawH) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

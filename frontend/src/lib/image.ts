export async function processImageFile(file: File | Blob): Promise<{ base64: string; mime_type: 'image/jpeg' }> {
  let sourceWidth = 0;
  let sourceHeight = 0;
  let bitmap: ImageBitmap | null = null;
  let imgElement: HTMLImageElement | null = null;
  let objectUrlToRevoke: string | null = null;

  try {
    if ('createImageBitmap' in window) {
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: 'from-image',
        });
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
      } catch {
        bitmap = null;
      }
    }

    if (!bitmap) {
      imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        objectUrlToRevoke = url;
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load sketch image.'));
        img.src = url;
      });
      sourceWidth = imgElement.naturalWidth || imgElement.width;
      sourceHeight = imgElement.naturalHeight || imgElement.height;
    }

    const maxDim = 1024;
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }

    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    } else if (imgElement) {
      ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    return {
      base64,
      mime_type: 'image/jpeg',
    };
  } finally {
    if (bitmap) {
      bitmap.close();
    }
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}

/** Largest photo kept in history (base64 chars); sealed it stays well under Firestore's 1 MiB field limit. */
export const PHOTO_MAX_BASE64 = 400_000;

/** Re-encode a JPEG smaller until it fits PHOTO_MAX_BASE64, for keeping in history. */
export async function shrinkForStorage(base64: string): Promise<string> {
  if (base64.length <= PHOTO_MAX_BASE64) return base64;
  const img = new Image();
  img.src = `data:image/jpeg;base64,${base64}`;
  await img.decode();
  for (const [maxDim, quality] of [
    [1024, 0.7],
    [900, 0.6],
    [768, 0.55],
    [640, 0.5],
    [512, 0.45],
  ] as const) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL('image/jpeg', quality).split(',')[1];
    if (out.length <= PHOTO_MAX_BASE64) return out;
  }
  throw new Error('Photo too large to keep');
}

export async function processImageFile(
  file: File | Blob
): Promise<{ base64: string; mime_type: 'image/jpeg' }> {
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

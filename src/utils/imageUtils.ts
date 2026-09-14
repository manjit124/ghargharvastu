/**
 * Client-side image compression utility
 * Resizes large images to a maximum dimension while maintaining aspect ratio,
 * compressing to JPEG format to optimize upload speed and prevent payload limits.
 */
export function compressImageIfNeeded(
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate mime type
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload a valid image file (JPEG, PNG, WebP, etc.)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Unable to parse image data"));
      img.onload = () => {
        let { width, height } = img;

        // If within bounds and small, return directly
        if (width <= maxDimension && height <= maxDimension && file.size < 800 * 1024) {
          resolve(dataUrl);
          return;
        }

        // Calculate aspect ratio preserving bounds
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing base64/dataURL image if its dimensions exceed maxDimension.
 */
export function compressDataUrlIfNeeded(
  dataUrl: string,
  maxDimension = 1280,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  code?: 'OVERSIZED_IMAGE' | 'INVALID_IMAGE_FORMAT' | 'CORRUPTED_IMAGE' | 'INVALID_PAYLOAD';
  statusCode?: number;
  sanitizedBase64?: string;
  detectedMimeType?: string;
  sizeBytes?: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 Megabytes
// Approx base64 length for 10MB: ~14.6 MB characters
const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 2048;

/**
 * Validates uploaded image base64 data completely on the server
 */
export function validateImageUpload(
  imageBase64: string,
  declaredMimeType = 'image/jpeg'
): ImageValidationResult {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return {
      valid: false,
      error: 'No image data provided',
      code: 'INVALID_PAYLOAD',
      statusCode: 400,
    };
  }

  // 1. Check raw base64 string length to avoid memory bomb before decoding
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return {
      valid: false,
      error: 'Image file exceeds maximum allowed size of 10 MB.',
      code: 'OVERSIZED_IMAGE',
      statusCode: 413,
    };
  }

  // Clean data URI prefix if present
  const cleanedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');

  if (!cleanedBase64 || cleanedBase64.length < 50) {
    return {
      valid: false,
      error: 'Corrupted or truncated image data provided.',
      code: 'CORRUPTED_IMAGE',
      statusCode: 400,
    };
  }

  // 2. Decode header bytes to verify magic number
  try {
    const headerBuffer = Buffer.from(cleanedBase64.substring(0, 100), 'base64');
    if (headerBuffer.length < 12) {
      return {
        valid: false,
        error: 'Invalid or incomplete image header.',
        code: 'CORRUPTED_IMAGE',
        statusCode: 400,
      };
    }

    const hex = headerBuffer.toString('hex').toLowerCase();
    let detectedMime = '';

    // JPEG: begins with ffd8ff
    if (hex.startsWith('ffd8ff')) {
      detectedMime = 'image/jpeg';
    }
    // PNG: begins with 89504e470d0a1a0a
    else if (hex.startsWith('89504e47')) {
      detectedMime = 'image/png';
    }
    // WEBP: begins with 52494646 (RIFF) and has 57454250 (WEBP) at bytes 8-11
    else if (hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') {
      detectedMime = 'image/webp';
    }
    // HEIC / HEIF: ftypheic / ftypmif1
    else if (hex.includes('6674797068656963') || hex.includes('667479706d696631')) {
      detectedMime = 'image/heic';
    }

    if (!detectedMime) {
      return {
        valid: false,
        error: 'Unsupported image format. Please upload a standard JPEG, PNG, or WebP photo.',
        code: 'INVALID_IMAGE_FORMAT',
        statusCode: 400,
      };
    }

    // Estimate decoded buffer size
    const estimatedSizeBytes = Math.floor((cleanedBase64.length * 3) / 4);
    if (estimatedSizeBytes > MAX_IMAGE_BYTES) {
      return {
        valid: false,
        error: 'Image file size exceeds the 10 MB maximum limit.',
        code: 'OVERSIZED_IMAGE',
        statusCode: 413,
      };
    }

    return {
      valid: true,
      sanitizedBase64: cleanedBase64,
      detectedMimeType: detectedMime,
      sizeBytes: estimatedSizeBytes,
    };
  } catch {
    return {
      valid: false,
      error: 'Failed to parse image data. Please ensure file is a valid image.',
      code: 'CORRUPTED_IMAGE',
      statusCode: 400,
    };
  }
}

export const validateUploadedImage = validateImageUpload;


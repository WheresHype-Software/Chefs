// Client-side photo preparation before upload.

const MAX_SIDE = 2000;
const QUALITY = 0.86;
const PASSTHROUGH = ["image/jpeg", "image/png", "image/webp"];

/**
 * Resizes a photo to at most 2000px and re-encodes it as JPEG. Phone photos shrink from several MB
 * to a few hundred KB, and re-encoding drops EXIF metadata such as the GPS position of the
 * chef's kitchen. If the browser cannot decode the file (e.g. HEIC outside Safari), web formats
 * are uploaded as they are and anything else is refused.
 */
export async function prepareImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (PASSTHROUGH.includes(file.type)) return file;
    throw new Error("unsupported");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("encode");
  return blob;
}

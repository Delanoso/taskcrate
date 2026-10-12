/** Compress a camera/gallery file to a JPEG data URL suitable for phone uploads. */
export async function fileToCompressedDataUrl(
  file: File,
  options?: { maxDim?: number; quality?: number },
): Promise<string> {
  const maxDim = options?.maxDim ?? 1280;
  const quality = options?.quality ?? 0.72;

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process photo");
      ctx.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", quality);
    } finally {
      bitmap.close();
    }
  } catch {
    // Safari sometimes rejects createImageBitmap for HEIC/odd camera formats.
    // Fall back to FileReader so the upload can still proceed.
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read photo"));
      reader.readAsDataURL(file);
    });
  }
}

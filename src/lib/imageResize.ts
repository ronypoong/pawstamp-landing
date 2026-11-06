/**
 * 업로드 전 클라이언트 리사이즈: 긴 변을 maxSide(기본 2000px) 이하로 줄여 JPEG 로 다시 인코딩.
 * - 이미 작은 JPEG/WEBP 는 원본 그대로(재압축 손실 방지).
 * - 브라우저가 디코드 못 하는 형식(대부분의 HEIC 등)은 원본을 그대로 보낸다 — 서버가 변환·리사이즈한다.
 */
export async function resizeImage(file: File, maxSide = 2000): Promise<{ blob: Blob; name: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { blob: file, name: file.name };
  }
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const passthrough = scale === 1 && /^image\/(jpeg|webp)$/.test(file.type) && file.size <= 3 * 1024 * 1024;
    if (passthrough) return { blob: file, name: file.name };
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, name: file.name };
    ctx.fillStyle = "#fff"; // 투명 PNG → JPEG 시 검은 배경 방지
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) return { blob: file, name: file.name };
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } finally {
    bitmap.close();
  }
}

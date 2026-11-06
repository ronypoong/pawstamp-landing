/**
 * 업로드 전 클라이언트 처리. 서버는 JPG/PNG/WEBP 만 받고 리사이즈하지 않는다.
 * - 긴 변을 maxSide(기본 2000px) 이하로 줄여 JPEG 로 다시 인코딩.
 * - 이미 작은 JPEG/WEBP 는 원본 그대로(재압축 손실 방지).
 * - HEIC/HEIF 는 브라우저가 디코딩할 수 있으면(사파리 등) JPEG 로 바꿔 올리고, 못 하면 UnsupportedImageError.
 */
export const HEIC_GUIDE =
  "아이폰 사진(HEIC)은 JPG로 저장해서 올려 주세요(사진 앱 공유 → '옵션' → 가장 호환성 높은 형식).";

export class UnsupportedImageError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const SERVER_TYPES = /^image\/(jpeg|png|webp)$/;

export function isHeic(file: File): boolean {
  return /^image\/hei[cf]/.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/** 업로드 가능한 사진인지(서버 형식이거나 HEIC — HEIC 는 변환 시도). */
export function isAcceptedImage(file: File): boolean {
  return SERVER_TYPES.test(file.type) || isHeic(file);
}

export async function resizeImage(file: File, maxSide = 2000): Promise<{ blob: Blob; name: string }> {
  if (!isAcceptedImage(file)) throw new UnsupportedImageError("JPG·PNG·WEBP 사진만 올릴 수 있어요.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (isHeic(file)) throw new UnsupportedImageError(HEIC_GUIDE);
    // 서버 형식인데 디코딩만 실패한 경우(드묾) — 원본 그대로 보내고 서버 검증에 맡긴다.
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
    if (!ctx) {
      if (isHeic(file)) throw new UnsupportedImageError(HEIC_GUIDE);
      return { blob: file, name: file.name };
    }
    ctx.fillStyle = "#fff"; // 투명 PNG → JPEG 시 검은 배경 방지
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) {
      if (isHeic(file)) throw new UnsupportedImageError(HEIC_GUIDE);
      return { blob: file, name: file.name };
    }
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } finally {
    bitmap.close();
  }
}

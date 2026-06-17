// 비로그인 사용자가 랜딩에서 피드백을 제출. BE의 /api/v1/public/feedback POST 호출.
// 카테고리: bug / suggestion / etc. 이메일 필수, 이미지 최대 3장 (각 10MB).

export type FeedbackCategory = "bug" | "suggestion" | "etc";

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  content: string;
  contactEmail: string;
  images: File[];
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://paw.rubi-on.com/api/v1";

export async function submitPublicFeedback(input: SubmitFeedbackInput): Promise<void> {
  const formData = new FormData();
  const payload = {
    category: input.category,
    content: input.content,
    contactEmail: input.contactEmail,
    platform: "web",
  };
  formData.append("payload", JSON.stringify(payload));
  input.images.slice(0, 3).forEach((file) => formData.append("images", file));

  const res = await fetch(`${API_BASE_URL}/public/feedback`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let message = `피드백 전송에 실패했습니다 (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      message = body?.error?.message ?? body?.message ?? message;
    } catch {
      // ignore JSON parsing errors
    }
    throw new Error(message);
  }
}

// 공개 성격검사 결과 유형 fetch. 공유 링크(/i/type/{code}) 티저 랜딩용. 무인증.
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://paw.rubi-on.com/api/v1";

export interface QuizResultType {
  code: string;
  name: string;
  tagline?: string | null;
  features: string[];
  oneLiner?: string | null;
  themeKey: string;
  emblem?: string | null;
  rarityTier: number;
  rarityLabel?: string | null;
  season?: string | null;
}

export async function fetchResultType(typeCode: string): Promise<QuizResultType> {
  const res = await fetch(`${API_BASE_URL}/public/quiz-events/types/${encodeURIComponent(typeCode)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`result type fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data as QuizResultType;
}

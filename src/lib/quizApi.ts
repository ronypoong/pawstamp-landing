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

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

export interface QuizEvent {
  code: string;
  title: string;
  subtitle?: string | null;
  eventType: string;
  themeKey: string;
  questions: QuizQuestion[];
}

// 진행 중 이벤트(문항+선택지 포함). 웹 랜딩에서 검사를 바로 풀 때 사용.
export async function fetchActiveEvent(type = "PERSONA"): Promise<QuizEvent> {
  const res = await fetch(`${API_BASE_URL}/public/quiz-events/active?type=${encodeURIComponent(type)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`active event fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data as QuizEvent;
}

// 선택한 옵션 id 배열로 결과 유형 판정(서버 계산, 저장 안 함 — 웹 익명용).
export async function resolveQuiz(code: string, answers: string[]): Promise<QuizResultType> {
  const res = await fetch(`${API_BASE_URL}/public/quiz-events/${encodeURIComponent(code)}/resolve`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error(`resolve failed: ${res.status}`);
  const json = await res.json();
  return json.data as QuizResultType;
}

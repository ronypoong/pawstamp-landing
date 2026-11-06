// 매장 체크인 QR(/i/checkin/:code) 공개 조회. 무인증. 앱 미설치 사용자에게 매장명만 보여주는 용도.
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://paw.rubi-on.com/api/v1";

export interface PublicVenue {
  venueName: string;
  category: string | null;
}

/** 없거나 비활성 매장(404)은 null. 그 외 실패는 throw. */
export async function fetchPublicVenue(code: string): Promise<PublicVenue | null> {
  if (import.meta.env.DEV) {
    // 개발 목업(?mock=ok|notfound). 프로덕션 번들에선 제거된다.
    const mock = new URLSearchParams(window.location.search).get("mock");
    if (mock === "notfound") return null;
    if (mock) return { venueName: "멍멍 플레이그라운드 성수점", category: "애견카페" };
  }
  const res = await fetch(`${API_BASE_URL}/public/venues/checkin/${encodeURIComponent(code)}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`venue fetch failed: ${res.status}`);
  const json = (await res.json()) as { data: PublicVenue };
  return json.data;
}

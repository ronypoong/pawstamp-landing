// 공개 약관 본문 fetch. 홈페이지는 무인증으로 BE의 /api/v1/public/terms/{type}를 호출한다.
// BE의 ApiResponse 래퍼는 { data: ... } 형태라 .data를 꺼낸다.

export type TermsType = "TERMS" | "PRIVACY" | "LOCATION" | "MARKETING" | "PRIVACY_POLICY";

export interface PublicTerms {
  type: TermsType;
  version: string;
  title: string;
  content: string;
  effectiveAt: string | null;
}

export interface PublicTermsVersion {
  version: string;
  title: string;
  effectiveAt: string | null;
  /** PUBLISHED=현재본, ARCHIVED=종전본 */
  status: "PUBLISHED" | "ARCHIVED";
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://paw.rubi-on.com/api/v1";

export async function fetchPublicTerms(type: TermsType): Promise<PublicTerms> {
  const res = await fetch(`${API_BASE_URL}/public/terms/${type}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`약관을 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { data?: PublicTerms };
  if (!body?.data) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  return body.data;
}

/** 약관 버전 이력(현재본+종전본). 이력이 1건뿐이면 UI에서 선택 없이 그대로 노출한다. */
export async function fetchPublicTermsVersions(type: TermsType): Promise<PublicTermsVersion[]> {
  const res = await fetch(`${API_BASE_URL}/public/terms/${type}/versions`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`약관 이력을 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { data?: PublicTermsVersion[] };
  return body?.data ?? [];
}

/** 특정 버전(현재본/종전본) 본문. */
export async function fetchPublicTermsVersion(type: TermsType, version: string): Promise<PublicTerms> {
  const res = await fetch(`${API_BASE_URL}/public/terms/${type}/versions/${encodeURIComponent(version)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`약관을 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { data?: PublicTerms };
  if (!body?.data) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  return body.data;
}

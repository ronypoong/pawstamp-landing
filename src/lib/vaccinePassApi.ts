// 접종 확인 QR 공개 조회(/i/pass/:token). 무인증. 보호자 정보·증빙 URL 등은 서버가 애초에 내려주지 않는다.
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://paw.rubi-on.com/api/v1";

export type VaccineStatus = "valid" | "expiring" | "expired" | "missing";

export interface VaccinePassPet {
  name: string;
  species?: string | null;
  breed?: string | null;
  photoUrl?: string | null;
  photoThumbnailUrl?: string | null;
}

export interface VaccinePassItem {
  code: string;
  name: string;
  matchedVaccineName: string | null;
  administeredAt: string | null; // YYYY-MM-DD
  expiresAt: string | null; // YYYY-MM-DD
  status: VaccineStatus;
  hasProof: boolean;
}

export interface VaccinePass {
  pet: VaccinePassPet;
  requiredVaccinations: VaccinePassItem[];
  checkedAt: string; // ISO
  expiresAt: string; // ISO
}

/** 410(만료·철회) / 404(없는 토큰) — 화면에선 동일하게 '열 수 없음'으로 처리. */
export class VaccinePassClosedError extends Error {
  constructor(public status: number) {
    super(`vaccine pass closed: ${status}`);
  }
}

export async function fetchVaccinePass(token: string): Promise<VaccinePass> {
  if (import.meta.env.DEV) {
    const mock = new URLSearchParams(window.location.search).get("mock");
    if (mock) return devMock(mock);
  }
  const res = await fetch(`${API_BASE_URL}/public/vaccine-pass/${encodeURIComponent(token)}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404 || res.status === 410) throw new VaccinePassClosedError(res.status);
  if (!res.ok) throw new Error(`vaccine pass fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data as VaccinePass;
}

/** 개발 모드 전용 목업(?mock=valid|expiring|expired|missing|empty|closed|loading). 프로덕션 번들에선 DEV 분기가 제거된다. */
async function devMock(kind: string): Promise<VaccinePass> {
  if (kind === "loading") return new Promise(() => {});
  if (kind === "closed") throw new VaccinePassClosedError(410);
  const base: VaccinePassItem[] = [
    { code: "DHPPL", name: "종합백신(DHPPL)", matchedVaccineName: null, administeredAt: "2026-04-02", expiresAt: "2027-04-02", status: "valid", hasProof: true },
    { code: "RABIES", name: "광견병", matchedVaccineName: "라비신", administeredAt: "2026-03-10", expiresAt: "2027-03-10", status: "valid", hasProof: false },
    { code: "CORONA", name: "코로나 장염", matchedVaccineName: null, administeredAt: "2026-02-01", expiresAt: "2027-02-01", status: "valid", hasProof: false },
    { code: "KC", name: "켄넬코프", matchedVaccineName: null, administeredAt: "2025-11-01", expiresAt: "2026-11-01", status: "valid", hasProof: true },
  ];
  const items = base.map((i) => ({ ...i }));
  if (kind === "expiring") items[3].status = "expiring";
  if (kind === "expired") {
    items[1] = { ...items[1], administeredAt: "2025-09-01", expiresAt: "2026-09-01", status: "expired" };
    items[3] = { ...items[3], administeredAt: null, expiresAt: null, status: "missing", hasProof: false };
  }
  if (kind === "missing") items[2] = { ...items[2], administeredAt: null, expiresAt: null, status: "missing" };
  const list =
    kind === "empty"
      ? items.map((i) => ({ ...i, administeredAt: null, expiresAt: null, status: "missing" as const, hasProof: false }))
      : items;
  return {
    pet: { name: "보리", species: "DOG", breed: "웰시코기", photoUrl: null, photoThumbnailUrl: null },
    requiredVaccinations: list,
    checkedAt: "2026-10-12T01:30:00Z",
    expiresAt: "2026-10-13T01:30:00Z",
  };
}

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

/** 공유 목적. 서버 미배포(구 응답)엔 없으므로 ENTRY 로 취급. */
export type PassScope = "ENTRY" | "GROOMING" | "CARE";

export interface EmergencyContact {
  name: string | null;
  relation: string | null;
  phone: string | null;
}

/** 범위별로 서버가 필요한 필드만 채워 내려준다(GROOMING: groomingNote·cautions / CARE: 전체). 모두 nullable. */
export interface PassCareGuide {
  feeding?: string | null;
  medication?: string | null;
  habits?: string | null;
  cautions?: string | null;
  groomingNote?: string | null;
  vetName?: string | null;
  vetPhone?: string | null;
  emergencyContacts?: EmergencyContact[] | null;
}

export interface VaccinePass {
  pet: VaccinePassPet;
  requiredVaccinations: VaccinePassItem[];
  checkedAt: string; // ISO
  expiresAt: string; // ISO
  scope?: PassScope | null;
  careGuide?: PassCareGuide | null;
}

export function passScope(data: VaccinePass): PassScope {
  return data.scope === "GROOMING" || data.scope === "CARE" ? data.scope : "ENTRY";
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

/** 개발 모드 전용 목업(?mock=valid|expiring|expired|missing|empty|closed|loading|care|grooming). 프로덕션 번들에선 DEV 분기가 제거된다. */
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
  if (kind === "care") {
    return {
      pet: { name: "보리", species: "DOG", breed: "웰시코기", photoUrl: null, photoThumbnailUrl: null },
      requiredVaccinations: items,
      checkedAt: "2026-10-12T01:30:00Z",
      expiresAt: "2026-10-15T14:59:59Z",
      scope: "CARE",
      careGuide: {
        feeding: "하루 2번 (아침 8시, 저녁 7시)\n로얄캐닌 미니 어덜트 종이컵 2/3컵",
        medication: "심장사상충 약 매달 1일 (이번 기간엔 없음)\n관절 영양제 저녁 식사에 1알 섞어 주세요",
        habits: "산책 하루 2번 30분, 실외배변만 해요\n잘 때는 켄넬에 들어가야 안심해요",
        cautions: "큰 개를 무서워해서 짖을 수 있어요\n발 만지면 예민해요",
        groomingNote: null,
        vetName: "튼튼동물병원",
        vetPhone: "02-123-4567",
        emergencyContacts: [{ name: "홍길순", relation: "보호자 동생", phone: "010-1234-5678" }],
      },
    };
  }
  if (kind === "grooming") {
    // 당일 자정(KST)까지 → 다음날 00:00 KST
    const kstToday = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    const expiresAt = new Date(new Date(`${kstToday}T00:00:00+09:00`).getTime() + 24 * 3600_000).toISOString();
    return {
      pet: { name: "보리", species: "DOG", breed: "웰시코기", photoUrl: null, photoThumbnailUrl: null },
      requiredVaccinations: items,
      checkedAt: new Date().toISOString(),
      expiresAt,
      scope: "GROOMING",
      careGuide: {
        groomingNote: "피부가 약해서 저자극 샴푸만 써 주세요\n닭고기 알러지 있어요 (간식 주의)",
        cautions: "발 만지면 예민해요",
      },
    };
  }
  return {
    pet: { name: "보리", species: "DOG", breed: "웰시코기", photoUrl: null, photoThumbnailUrl: null },
    requiredVaccinations: list,
    checkedAt: "2026-10-12T01:30:00Z",
    expiresAt: "2026-10-13T01:30:00Z",
  };
}

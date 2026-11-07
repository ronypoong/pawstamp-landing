// 발도장 파트너(업체용 펫 패스) API. 계약: 파트너 MVP CONTRACT.md
// - 인증: 이메일 6자리 코드 → 파트너 전용 JWT(30일). 토큰은 localStorage 에 보관(접근 불가 환경이면 메모리만).
// - 401 이면 토큰을 지우고 PartnerAuthError 를 던진다 → 화면이 로그인으로 보낸다.
// - 업체에는 손님이 보낸 반려동물 정보만 내려온다(보호자 이름·연락처·userId 없음).

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://paw.rubi-on.com/api/v1";

const TOKEN_KEY = "pawstamp.partner.token";

export type CheckinVaccineStatus = "valid" | "expiring" | "expired" | "missing";

export interface PartnerProfile {
  id: number;
  email: string;
  name: string | null;
}

export interface VerifyResult {
  accessToken: string;
  partner: PartnerProfile;
  isNew: boolean;
}

export interface PlaceSearchItem {
  petCafeId: number;
  name: string;
  address: string | null;
  category: string | null;
  claimed: boolean;
}

export interface Venue {
  id: number;
  name: string;
  address: string | null;
  category: string | null;
  checkinCode: string;
  checkinUrl: string;
  petCafeId: number | null;
  active: boolean;
  createdAt: string;
  /** 매장(사업자) 인증. 구 응답엔 없을 수 있음. */
  verificationStatus?: VerificationStatus | null;
  /** 인증 서류 제출 시각. PENDING 인데 null 이면 아직 제출 전. */
  verificationSubmittedAt?: string | null;
  /** REJECTED 사유 */
  verificationRejectReason?: string | null;
  /** 지도 좌표 연결 여부. false 면 앱 지도에 안 나옴(구 응답엔 없을 수 있음). */
  hasLocation?: boolean;
  /** 현재 지도 위치(없으면 null). editable=false 면 공공 나들이 장소에 연결된 상태 */
  location?: VenueLocation | null;
}

export interface VenueLocation {
  petCafeId: number | null;
  name: string | null;
  address: string | null;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  editable: boolean;
}

/** 네이버 장소/주소 검색 후보 */
export interface NaverPlace {
  name: string;
  address: string | null;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  /** 네이버 지도 링크(있으면) */
  link?: string | null;
  telephone?: string | null;
  /** 이미 발도장 나들이 장소로 있는 곳이면 그 id */
  existingPetCafeId: number | null;
  /** 다른 파트너가 이미 연결한 곳 */
  claimed: boolean;
}

export type PlaceSearchType = "place" | "address";

/** BE 가 naverPlace.category 로 받는 장소 유형 코드 */
export type PlaceTypeCode = "cafe" | "restaurant" | "park" | "camping" | "stay" | "daycare" | "grooming" | "hospital";

export const PLACE_TYPES: { code: PlaceTypeCode; label: string }[] = [
  { code: "cafe", label: "애견카페" },
  { code: "restaurant", label: "음식점·카페(일반)" },
  { code: "daycare", label: "유치원·호텔" },
  { code: "grooming", label: "미용" },
  { code: "stay", label: "숙소" },
  { code: "camping", label: "캠핑" },
  { code: "hospital", label: "동물병원" },
  { code: "park", label: "공원·운동장" },
];

/** 네이버 카테고리 문자열(예: "카페,디저트>애견카페")로 업종 기본값 추정. */
export function guessPlaceType(category: string | null | undefined): PlaceTypeCode {
  const c = category ?? "";
  if (/동물병원/.test(c)) return "hospital";
  if (/애견미용|펫미용|미용/.test(c) && /애견|반려|펫|동물/.test(c)) return "grooming";
  if (/애견카페|반려견카페|강아지카페|펫카페/.test(c)) return "cafe";
  if (/애견호텔|펫호텔|유치원|펫시터|위탁/.test(c)) return "daycare";
  if (/캠핑|글램핑|야영|오토캠핑/.test(c)) return "camping";
  if (/펜션|숙박|호텔|리조트|게스트하우스|모텔|민박|풀빌라/.test(c)) return "stay";
  if (/공원|운동장|놀이터|산책/.test(c)) return "park";
  if (/음식점|식당|카페|디저트|베이커리|한식|양식|일식|중식|분식|주점|술집|브런치|레스토랑/.test(c)) return "restaurant";
  return "cafe";
}

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

/** 화면용 인증 단계: 제출 전 / 운영팀 확인 중 / 인증 완료 / 반려. */
export type VerificationStep = "unsubmitted" | "pending" | "verified" | "rejected";

export function verificationStep(v: Venue): VerificationStep {
  if (v.verificationStatus === "VERIFIED") return "verified";
  if (v.verificationStatus === "REJECTED") return "rejected";
  if (v.verificationStatus === "PENDING" && v.verificationSubmittedAt) return "pending";
  return "unsubmitted";
}

export interface VerificationInput {
  /** 숫자 10자리(하이픈 제외) */
  bizNo: string;
  ownerName: string;
  /** YYYYMMDD */
  openDate: string;
  /** 상호(사업자등록증 상호명). 매장명과 다르면 서버가 PENDING 으로 두고 운영팀 확인. */
  businessName: string;
}

export type CreateVenueInput =
  | { petCafeId: number }
  | { naverPlace: NaverPlace }
  | { name: string; address: string; category: string; phone?: string };

export type VenuePlaceInput = { petCafeId: number } | { naverPlace: NaverPlace };

export interface CheckinItem {
  code: string;
  name: string;
  status: CheckinVaccineStatus;
  expiresAt: string | null;
}

export interface Checkin {
  id: number;
  checkedInAt: string;
  pet: { name: string; species: string | null; breed: string | null; photoThumbnailUrl: string | null };
  vaccineStatus: CheckinVaccineStatus;
  items: CheckinItem[];
  visitCount: number;
}

export interface VenueStats {
  visits: number;
  uniquePets: number;
  newPets: number;
  returningPets: number;
  /** 0~1 비율 */
  revisitRate30d: number;
  byWeekday: { weekday: number; count: number }[];
  byHour: { hour: number; count: number }[];
  daily: { date: string; count: number }[];
  topRegulars: { petName: string; breed: string | null; visitCount: number; lastVisitAt: string }[];
  appViews: number;
  appNavigations: number;
  vaccineMix: { valid: number; expiring: number; expired: number; missing: number };
}

export class PartnerAuthError extends Error {
  constructor() {
    super("partner unauthorized");
  }
}

export class PartnerApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

// ─── 토큰 보관 ───────────────────────────────
let memoryToken: string | null = null;

export function getPartnerToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setPartnerToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 사파리 개인정보 보호 모드 등 — 메모리 토큰으로만 유지
  }
}

// ─── 공통 요청 ───────────────────────────────
async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  if (import.meta.env.DEV && isMockMode()) return devMock<T>(path, init);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getPartnerToken();
    if (!token) throw new PartnerAuthError();
    headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new PartnerApiError(0, "네트워크 연결을 확인해 주세요.");
  }
  if (res.status === 401 && auth) {
    setPartnerToken(null);
    throw new PartnerAuthError();
  }
  if (!res.ok) {
    let message = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } };
      message = body?.error?.message || message;
      code = body?.error?.code;
    } catch {
      // 본문 없음
    }
    throw new PartnerApiError(res.status, message, code);
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as { data: T };
  return json.data;
}

/** BE 가 VALID/EXPIRING… 대문자로 내려줘도 화면은 소문자 키로 다룬다. */
function normStatus(s: string | null | undefined): CheckinVaccineStatus {
  const v = (s ?? "").toLowerCase();
  return v === "valid" || v === "expiring" || v === "expired" ? v : "missing";
}

// ─── 인증 ────────────────────────────────────
export function sendPartnerCode(email: string): Promise<void> {
  return request<void>("/partner/auth/email/send", { method: "POST", body: JSON.stringify({ email }) }, false);
}

export async function verifyPartnerCode(email: string, code: string): Promise<VerifyResult> {
  const result = await request<VerifyResult>(
    "/partner/auth/email/verify",
    { method: "POST", body: JSON.stringify({ email, code }) },
    false,
  );
  setPartnerToken(result.accessToken);
  return result;
}

export function fetchPartnerMe(): Promise<PartnerProfile> {
  return request<PartnerProfile>("/partner/me");
}

export function updatePartnerMe(name: string): Promise<PartnerProfile> {
  return request<PartnerProfile>("/partner/me", { method: "PATCH", body: JSON.stringify({ name }) });
}

// ─── 매장 ────────────────────────────────────
export function searchPlaces(q: string): Promise<PlaceSearchItem[]> {
  return request<PlaceSearchItem[]>(`/partner/places/search?q=${encodeURIComponent(q)}`);
}

/** 네이버 장소 검색(type=place) 또는 도로명 주소 검색(type=address). */
export async function searchNaverPlaces(q: string, type: PlaceSearchType): Promise<NaverPlace[]> {
  let list: NaverPlace[];
  try {
    list = await request<NaverPlace[]>(`/partner/places/naver-search?q=${encodeURIComponent(q)}&type=${type}`);
  } catch (e) {
    if (e instanceof PartnerApiError && e.status === 429) {
      throw new PartnerApiError(429, "검색을 너무 자주 했어요. 1분 뒤 다시 찾아 주세요.", e.code);
    }
    if (e instanceof PartnerApiError && e.status === 503) {
      throw new PartnerApiError(503, "지금은 네이버 검색을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.", e.code);
    }
    throw e;
  }
  return (list ?? []).filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
}

/** 좌표 없는 매장에 위치 연결. */
export function setVenuePlace(venueId: number, input: VenuePlaceInput): Promise<Venue> {
  return request<Venue>(`/partner/venues/${venueId}/place`, { method: "PUT", body: JSON.stringify(input) });
}

/** 네이버 지도에서 보기 링크(후보에 link 가 없으면 이름+주소 검색). */
export function naverMapUrl(p: Pick<NaverPlace, "name" | "roadAddress" | "address" | "link">): string {
  if (p.link && /^https?:\/\//.test(p.link)) return p.link;
  return `https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${p.roadAddress || p.address || ""}`.trim())}`;
}

export function createVenue(input: CreateVenueInput): Promise<Venue> {
  return request<Venue>("/partner/venues", { method: "POST", body: JSON.stringify(input) });
}

export function fetchVenues(): Promise<Venue[]> {
  return request<Venue[]>("/partner/venues");
}

/** 매장 삭제. confirmName 은 매장명과 같아야 한다(서버 재검증). */
export function deleteVenue(id: number, confirmName: string): Promise<void> {
  return request<void>(`/partner/venues/${id}`, { method: "DELETE", body: JSON.stringify({ confirmName }) });
}

export function updateVenue(id: number, patch: { name?: string; phone?: string; active?: boolean }): Promise<Venue> {
  return request<Venue>(`/partner/venues/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function fetchCheckins(venueId: number, date?: string): Promise<Checkin[]> {
  const q = date ? `?date=${date}` : "";
  const list = await request<Checkin[]>(`/partner/venues/${venueId}/checkins${q}`);
  return (list ?? []).map((c) => ({
    ...c,
    vaccineStatus: normStatus(c.vaccineStatus),
    items: (c.items ?? []).map((i) => ({ ...i, status: normStatus(i.status) })),
  }));
}

export async function fetchVenueStats(venueId: number, from: string, to: string): Promise<VenueStats> {
  const s = await request<VenueStats>(`/partner/venues/${venueId}/stats?from=${from}&to=${to}`);
  const mix = s.vaccineMix ?? { valid: 0, expiring: 0, expired: 0, missing: 0 };
  return {
    ...s,
    byWeekday: s.byWeekday ?? [],
    byHour: s.byHour ?? [],
    daily: s.daily ?? [],
    topRegulars: s.topRegulars ?? [],
    vaccineMix: mix,
  };
}

// ─── 매장 꾸미기(프로필) — 2단계 계약 ─────────
export type HoursDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" | "HOLIDAY";

export interface HoursEntry {
  day: HoursDay;
  open: string; // "10:00"
  close: string; // "21:00"
  closed: boolean;
}

export interface VenuePhoto {
  id: number;
  url: string;
  thumbnailUrl: string | null;
  order: number;
  /** 운영자가 숨긴 사진 */
  hidden: boolean;
}

export interface VenueProfileInput {
  tagline: string | null;
  description: string | null;
  hours: HoursEntry[];
  hoursNote: string | null;
  phone: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  tags: { preset: string[]; custom: string[] };
}

export interface VenueProfile extends VenueProfileInput {
  photos: VenuePhoto[];
  hiddenByAdmin: boolean;
  hiddenReason: string | null;
}

export interface TagDef {
  code: string;
  label: string;
}

/** 서버 목록을 못 받을 때의 폴백(계약서와 동일). */
export const DEFAULT_TAGS: TagDef[] = [
  { code: "LARGE_DOG", label: "대형견 가능" },
  { code: "SMALL_DOG_ONLY", label: "소형견 전용" },
  { code: "INDOOR", label: "실내" },
  { code: "OUTDOOR", label: "야외" },
  { code: "PARKING", label: "주차 가능" },
  { code: "OFF_LEASH", label: "오프리쉬" },
  { code: "POOL", label: "수영장" },
  { code: "DOG_MENU", label: "강아지 메뉴" },
  { code: "ROOFTOP", label: "루프탑" },
  { code: "NO_KIDS", label: "노키즈" },
  { code: "PHOTO_SPOT", label: "포토 스팟" },
  { code: "QUIET", label: "조용한" },
  { code: "GROOMING", label: "미용" },
  { code: "HOTEL", label: "호텔" },
  { code: "DAYCARE", label: "유치원" },
  { code: "NEAR_PARK", label: "공원 근처" },
];

export const PHOTO_LIMIT = 10;

function normProfile(p: Partial<VenueProfile> | null | undefined): VenueProfile {
  return {
    tagline: p?.tagline ?? null,
    description: p?.description ?? null,
    hours: p?.hours ?? [],
    hoursNote: p?.hoursNote ?? null,
    phone: p?.phone ?? null,
    instagramUrl: p?.instagramUrl ?? null,
    websiteUrl: p?.websiteUrl ?? null,
    tags: { preset: p?.tags?.preset ?? [], custom: p?.tags?.custom ?? [] },
    photos: [...(p?.photos ?? [])].sort((a, b) => a.order - b.order),
    hiddenByAdmin: !!p?.hiddenByAdmin,
    hiddenReason: p?.hiddenReason ?? null,
  };
}

export async function fetchVenueProfile(venueId: number): Promise<VenueProfile> {
  return normProfile(await request<VenueProfile>(`/partner/venues/${venueId}/profile`));
}

export async function saveVenueProfile(venueId: number, input: VenueProfileInput): Promise<VenueProfile> {
  return normProfile(
    await request<VenueProfile>(`/partner/venues/${venueId}/profile`, { method: "PUT", body: JSON.stringify(input) }),
  );
}

export async function fetchPartnerTags(): Promise<TagDef[]> {
  try {
    const list = await request<TagDef[]>("/partner/tags");
    return list?.length ? list : DEFAULT_TAGS;
  } catch (e) {
    if (e instanceof PartnerAuthError) throw e;
    return DEFAULT_TAGS;
  }
}

export function deleteVenuePhoto(venueId: number, photoId: number): Promise<void> {
  return request<void>(`/partner/venues/${venueId}/photos/${photoId}`, { method: "DELETE" });
}

export function reorderVenuePhotos(venueId: number, photoIds: number[]): Promise<void> {
  return request<void>(`/partner/venues/${venueId}/photos/order`, { method: "PUT", body: JSON.stringify({ photoIds }) });
}

/** 사진 업로드(multipart `file`). 진행률 콜백을 위해 XHR 사용. */
export function uploadVenuePhoto(venueId: number, file: Blob, fileName: string, onProgress: (ratio: number) => void): Promise<VenuePhoto> {
  if (import.meta.env.DEV && isMockMode()) return mockUpload(file, onProgress);
  const form = new FormData();
  form.append("file", file, fileName);
  return postMultipart<VenuePhoto>(`/partner/venues/${venueId}/photos`, form, onProgress, "사진을 올리지 못했어요.", true);
}

/**
 * 사업자 인증(국세청 자동 진위확인). JSON {bizNo, ownerName, openDate, businessName}.
 * 200 → 갱신된 매장(VERIFIED 또는 상호 불일치 시 PENDING). 422 → 국세청 정보 불일치(서버 메시지 표시).
 * 응답에 매장이 없으면 null(호출부가 목록을 다시 불러 판단).
 */
export async function submitVerification(venueId: number, input: VerificationInput): Promise<Venue | null> {
  if (import.meta.env.DEV && isMockMode()) {
    await new Promise((res) => setTimeout(res, 600));
    // 목업: 대표자명 '불일치' → 422, 상호가 매장명과 다르면 PENDING, 그 외 VERIFIED
    if (input.ownerName === "불일치") {
      throw new PartnerApiError(422, "국세청 등록 정보와 일치하지 않아요. 사업자번호·대표자명·개업일을 다시 확인해 주세요.", "VERIFICATION_MISMATCH");
    }
    const sameName = input.businessName.replace(/\s/g, "") === "멍멍플레이그라운드성수점";
    mockVerification = { status: sameName ? "VERIFIED" : "PENDING", submittedAt: new Date().toISOString(), reason: null };
    mockVerificationInfo = {
      bizNo: `${input.bizNo.slice(0, 3)}-${input.bizNo.slice(3, 5)}-*****`,
      ownerName: input.ownerName.charAt(0) + "*".repeat(Math.max(1, input.ownerName.length - 2)) + (input.ownerName.length > 2 ? input.ownerName.slice(-1) : ""),
      openDate: input.openDate,
      businessName: input.businessName,
    };
    return null;
  }
  const venue = await request<Venue | null>(`/partner/venues/${venueId}/verification`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return venue && typeof venue === "object" && "verificationStatus" in venue ? venue : null;
}

/** 제출한 사업자 정보(마스킹). 서버가 내려주는 필드명 차이를 여기서 흡수한다. */
export interface VerificationInfo {
  /** 예: 123-45-***** */
  bizNoMasked: string;
  /** 예: 김*수 */
  ownerNameMasked: string;
  /** YYYY-MM-DD */
  openDate: string | null;
  businessName: string | null;
  status: VerificationStatus | null;
  /** 마지막 확인(국세청 조회/운영팀 확인) 시각 ISO */
  checkedAt: string | null;
}

function toIsoDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const digits = d.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}` : null;
}

/** 제출 전이면(404) null. */
export async function fetchVerificationInfo(venueId: number): Promise<VerificationInfo | null> {
  let raw: Record<string, unknown> | null;
  try {
    raw = await request<Record<string, unknown> | null>(`/partner/venues/${venueId}/verification`);
  } catch (e) {
    if (e instanceof PartnerApiError && e.status === 404) return null;
    throw e;
  }
  if (!raw) return null;
  const str = (...keys: string[]) => {
    for (const k of keys) if (typeof raw![k] === "string" && raw![k]) return raw![k] as string;
    return null;
  };
  return {
    bizNoMasked: str("bizNoMasked", "maskedBizNo", "bizNo") ?? "",
    ownerNameMasked: str("ownerNameMasked", "maskedOwnerName", "ownerName") ?? "",
    openDate: toIsoDate(str("openDate")),
    businessName: str("businessName"),
    status: (str("status", "verificationStatus") as VerificationStatus | null) ?? null,
    checkedAt: str("checkedAt", "lastCheckedAt", "verifiedAt", "updatedAt", "submittedAt"),
  };
}

/** 이미 다른 파트너가 연결한 장소에 대한 소유 이의 제기. */
export function submitClaimDispute(petCafeId: number, message: string): Promise<void> {
  return request<void>(`/partner/places/${petCafeId}/claim-dispute`, { method: "POST", body: JSON.stringify({ message }) });
}

function postMultipart<T>(path: string, form: FormData, onProgress: (r: number) => void, fallback: string, requireData: boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getPartnerToken();
    if (!token) {
      reject(new PartnerAuthError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new PartnerApiError(0, "네트워크 연결을 확인해 주세요."));
    xhr.onload = () => {
      if (xhr.status === 401) {
        setPartnerToken(null);
        reject(new PartnerAuthError());
        return;
      }
      let body: { data?: T; error?: { message?: string; code?: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // 본문 없음
      }
      if (xhr.status < 200 || xhr.status >= 300 || (requireData && !body?.data)) {
        reject(new PartnerApiError(xhr.status, body?.error?.message || fallback, body?.error?.code));
        return;
      }
      resolve(body?.data as T);
    };
    xhr.send(form);
  });
}

// ─── 날짜 유틸(KST) ──────────────────────────
/** KST 기준 YYYY-MM-DD. offsetDays 만큼 이동. */
export function kstDate(offsetDays = 0): string {
  return new Date(Date.now() + 9 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

// ─── 개발 목업 (?mock=1 이면 sessionStorage 에 켜져 유지) ─────────────
function isMockMode(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get("mock");
    if (q === "0") window.sessionStorage.removeItem("partnerMock");
    else if (q) window.sessionStorage.setItem("partnerMock", q);
    return !!window.sessionStorage.getItem("partnerMock");
  } catch {
    return false;
  }
}

async function devMock<T>(path: string, init: RequestInit): Promise<T> {
  await new Promise((r) => setTimeout(r, 250));
  const kind = window.sessionStorage.getItem("partnerMock");
  const venue: Venue = {
    id: 1,
    name: "멍멍 플레이그라운드 성수점",
    address: "서울 성동구 성수이로 00",
    category: "애견카페",
    checkinCode: "aB3dE5fG7h",
    checkinUrl: "https://pawstamp.rubi-on.com/i/checkin/aB3dE5fG7h",
    petCafeId: kind === "nolink" ? null : 10,
    active: true,
    createdAt: "2026-11-01T00:00:00Z",
    ...mockVenueVerification(kind),
    hasLocation: mockHasLocation ?? kind !== "noloc",
    location:
      (mockHasLocation ?? kind !== "noloc")
        ? {
            petCafeId: 10,
            name: "멍멍 플레이그라운드 성수점",
            address: "서울 성동구 성수동2가 300-1",
            roadAddress: "서울 성동구 성수이로 00",
            latitude: 37.5445,
            longitude: 127.0557,
            editable: kind !== "public",
          }
        : null,
  };
  const method = init.method ?? "GET";
  if (path.startsWith("/partner/auth/email/verify")) {
    return { accessToken: "mock", partner: { id: 1, email: "owner@example.com", name: "김사장" }, isNew: false } as T;
  }
  if (path.startsWith("/partner/auth")) return undefined as T;
  if (path.startsWith("/partner/me")) return { id: 1, email: "owner@example.com", name: "김사장" } as T;
  if (path.startsWith("/partner/places/search")) {
    return [
      { petCafeId: 10, name: "멍멍 플레이그라운드 성수점", address: "서울 성동구 성수이로 00", category: "애견카페", claimed: false },
      { petCafeId: 11, name: "멍멍 플레이그라운드 홍대점", address: "서울 마포구 와우산로 00", category: "애견카페", claimed: true },
    ] as T;
  }
  if (path === "/partner/venues" && method === "POST") {
    mockVerification = { status: "PENDING", submittedAt: null, reason: null };
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    mockHasLocation = "naverPlace" in body || "petCafeId" in body;
    return { ...venue, ...mockVenueVerification(kind), hasLocation: mockHasLocation } as T;
  }
  if (path.includes("/claim-dispute")) return undefined as T;
  if (path.startsWith("/partner/places/naver-search")) {
    const qs = new URLSearchParams(path.split("?")[1]);
    const q = qs.get("q") ?? "";
    if (q.includes("없음")) return [] as T;
    if (qs.get("type") === "address") {
      return [
        { name: q, address: "서울 성동구 성수동2가 300-1", roadAddress: `서울 성동구 ${q}`, latitude: 37.5445, longitude: 127.0557, category: null, link: null, existingPetCafeId: null, claimed: false },
      ] as T;
    }
    return [
      { name: `${q} 성수점`, address: "서울 성동구 성수동2가 300-1", roadAddress: "서울 성동구 성수이로 00", latitude: 37.5445, longitude: 127.0557, category: "카페,디저트>애견카페", link: null, telephone: "02-123-4567", existingPetCafeId: null, claimed: false },
      { name: `${q} 홍대점`, address: "서울 마포구 서교동 400", roadAddress: "서울 마포구 와우산로 00", latitude: 37.5512, longitude: 126.9227, category: "애견카페", link: null, existingPetCafeId: 11, claimed: true },
      { name: `${q} 강남점`, address: "서울 강남구 역삼동 500", roadAddress: "서울 강남구 테헤란로 00", latitude: 37.5, longitude: 127.03, category: "애견동반 카페", link: null, existingPetCafeId: 12, claimed: false },
    ] as T;
  }
  if (path.endsWith("/place") && method === "PUT") {
    mockHasLocation = true;
    return { ...venue, hasLocation: true } as T;
  }
  if (/^\/partner\/venues\/\d+$/.test(path) && method === "DELETE") {
    const id = Number(path.split("/").pop());
    const { confirmName } = JSON.parse(String(init.body)) as { confirmName: string };
    const name = id === 1 ? venue.name : "멍멍 호텔 성수";
    if (confirmName.trim() !== name) throw new PartnerApiError(422, "매장명이 일치하지 않아요.", "PARTNER_VENUE_NAME_MISMATCH");
    mockDeleted.add(id);
    return undefined as T;
  }
  if (path === "/partner/venues") {
    if (kind === "novenue") return [] as T;
    const all = kind === "single" ? [venue] : [venue, { ...venue, id: 2, name: "멍멍 호텔 성수", checkinCode: "zz9", checkinUrl: "https://pawstamp.rubi-on.com/i/checkin/zz9" }];
    return all.filter((v) => !mockDeleted.has(v.id)) as T;
  }
  if (path.includes("/checkins")) {
    if (kind === "empty") return [] as T;
    const now = Date.now();
    const statuses: CheckinVaccineStatus[] = ["valid", "expiring", "expired", "missing", "valid"];
    const names = ["보리", "콩이", "초코", "두부", "망고"];
    const breeds = ["웰시코기", "말티즈", "푸들", "시바견", null];
    return names.map((name, i) => ({
      id: i + 1,
      checkedInAt: new Date(now - i * 47 * 60_000).toISOString(),
      pet: { name, species: "DOG", breed: breeds[i], photoThumbnailUrl: null },
      vaccineStatus: statuses[i],
      visitCount: [1, 3, 12, 1, 5][i],
      items: [
        { code: "DHPPL", name: "종합백신(DHPPL)", status: "valid", expiresAt: "2027-04-02" },
        { code: "RABIES", name: "광견병", status: statuses[i] === "missing" ? "missing" : "valid", expiresAt: statuses[i] === "missing" ? null : "2027-03-10" },
        { code: "KC", name: "켄넬코프", status: statuses[i], expiresAt: statuses[i] === "missing" ? null : "2026-11-20" },
      ],
    })) as T;
  }
  if (path.endsWith("/verification") && method === "GET") {
    const v = mockVenueVerification(kind);
    if (!v.verificationSubmittedAt) throw new PartnerApiError(404, "not found");
    const info = mockVerificationInfo ?? { bizNo: "220-81-*****", ownerName: "김*장", openDate: "20200301", businessName: "멍멍 플레이그라운드" };
    return { ...info, status: v.verificationStatus, checkedAt: v.verificationSubmittedAt } as T;
  }
  if (path.endsWith("/profile")) {
    if (method === "PUT") {
      mockProfile = { ...mockProfile, ...(JSON.parse(String(init.body)) as VenueProfileInput) };
    }
    if (kind === "full" && !mockSeeded) {
      mockSeeded = true;
      mockProfile = normProfile({
        tagline: "대형견도 뛰어노는 성수 루프탑 애견카페",
        description: "300평 실내 놀이터와 루프탑 운동장이 있어요.\n강아지 전용 메뉴(멍푸치노·수제 간식)도 준비돼 있어요.",
        hours: (["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "HOLIDAY"] as HoursDay[]).map((day) => ({
          day,
          open: "11:00",
          close: day === "SAT" || day === "SUN" ? "22:00" : "21:00",
          closed: day === "MON",
        })),
        hoursNote: "라스트오더 20:30",
        phone: "02-123-4567",
        instagramUrl: "https://instagram.com/mungmung_play",
        websiteUrl: null,
        tags: { preset: ["LARGE_DOG", "ROOFTOP", "DOG_MENU", "PARKING"], custom: ["생일파티"] },
        photos: ["joint", "nosework", "vitality"].map((n, i) => ({ id: i + 1, url: `/ads/${n}.svg`, thumbnailUrl: `/ads/${n}.svg`, order: i, hidden: i === 2 })),
      });
    }
    if (kind === "hidden") return { ...mockProfile, hiddenByAdmin: true, hiddenReason: "대표 사진이 매장과 관련 없는 이미지예요." } as T;
    return mockProfile as T;
  }
  if (path === "/partner/tags") return DEFAULT_TAGS as T;
  if (path.includes("/photos/order")) {
    const ids = (JSON.parse(String(init.body)) as { photoIds: number[] }).photoIds;
    mockProfile.photos = ids.map((id, order) => ({ ...mockProfile.photos.find((p) => p.id === id)!, order }));
    return undefined as T;
  }
  if (path.includes("/photos/") && method === "DELETE") {
    const id = Number(path.split("/").pop());
    mockProfile.photos = mockProfile.photos.filter((p) => p.id !== id);
    return undefined as T;
  }
  if (path.includes("/stats")) {
    const empty = kind === "empty";
    const n = (v: number) => (empty ? 0 : v);
    return {
      visits: n(184),
      uniquePets: n(97),
      newPets: n(61),
      returningPets: n(36),
      revisitRate30d: empty ? 0 : 0.37,
      byWeekday: [1, 2, 3, 4, 5, 6, 7].map((w) => ({ weekday: w, count: n([18, 14, 16, 20, 31, 46, 39][w - 1]) })),
      byHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: n(h < 10 || h > 21 ? 0 : Math.round(8 + 14 * Math.sin(((h - 10) / 11) * Math.PI))) })),
      daily: [],
      topRegulars: empty
        ? []
        : [
            { petName: "초코", breed: "푸들", visitCount: 12, lastVisitAt: new Date().toISOString() },
            { petName: "망고", breed: null, visitCount: 7, lastVisitAt: new Date(Date.now() - 86_400_000 * 2).toISOString() },
            { petName: "콩이", breed: "말티즈", visitCount: 5, lastVisitAt: new Date(Date.now() - 86_400_000 * 6).toISOString() },
          ],
      appViews: n(523),
      appNavigations: n(88),
      vaccineMix: { valid: n(131), expiring: n(22), expired: n(9), missing: n(22) },
    } as T;
  }
  return undefined as T;
}

let mockProfile: VenueProfile = normProfile(null);
let mockPhotoSeq = 100;
let mockSeeded = false;

async function mockUpload(file: Blob, onProgress: (r: number) => void): Promise<VenuePhoto> {
  for (let i = 1; i <= 5; i++) {
    await new Promise((r) => setTimeout(r, 150));
    onProgress(i / 5);
  }
  if (window.sessionStorage.getItem("partnerMock") === "uploadfail") throw new PartnerApiError(500, "사진을 올리지 못했어요.");
  const url = URL.createObjectURL(file);
  const photo: VenuePhoto = { id: ++mockPhotoSeq, url, thumbnailUrl: url, order: mockProfile.photos.length, hidden: false };
  mockProfile.photos = [...mockProfile.photos, photo];
  return photo;
}

/** 목업 인증 상태: ?mock=unverified|pending|rejected 로 시작, 그 외엔 인증 완료. 제출하면 pending 으로. */
let mockHasLocation: boolean | null = null;
const mockDeleted = new Set<number>();
let mockVerificationInfo: { bizNo: string; ownerName: string; openDate: string; businessName: string } | null = null;
let mockVerification: { status: VerificationStatus; submittedAt: string | null; reason: string | null } | null = null;

function mockVenueVerification(kind: string | null): Pick<Venue, "verificationStatus" | "verificationSubmittedAt" | "verificationRejectReason"> {
  if (!mockVerification) {
    mockVerification =
      kind === "unverified"
        ? { status: "PENDING", submittedAt: null, reason: null }
        : kind === "pending"
          ? { status: "PENDING", submittedAt: "2026-11-07T01:00:00Z", reason: null }
          : kind === "rejected"
            ? { status: "REJECTED", submittedAt: "2026-11-06T01:00:00Z", reason: "사업자등록증 사진이 흐려 상호와 번호를 읽을 수 없어요." }
            : { status: "VERIFIED", submittedAt: "2026-11-01T01:00:00Z", reason: null };
  }
  return {
    verificationStatus: mockVerification.status,
    verificationSubmittedAt: mockVerification.submittedAt,
    verificationRejectReason: mockVerification.reason,
  };
}

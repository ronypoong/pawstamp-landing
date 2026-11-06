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
}

export type CreateVenueInput =
  | { petCafeId: number }
  | { name: string; address: string; category: string; phone?: string };

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

export function createVenue(input: CreateVenueInput): Promise<Venue> {
  return request<Venue>("/partner/venues", { method: "POST", body: JSON.stringify(input) });
}

export function fetchVenues(): Promise<Venue[]> {
  return request<Venue[]>("/partner/venues");
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
  return new Promise((resolve, reject) => {
    const token = getPartnerToken();
    if (!token) {
      reject(new PartnerAuthError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/partner/venues/${venueId}/photos`);
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
      let body: { data?: VenuePhoto; error?: { message?: string; code?: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // 본문 없음
      }
      if (xhr.status < 200 || xhr.status >= 300 || !body?.data) {
        reject(new PartnerApiError(xhr.status, body?.error?.message || "사진을 올리지 못했어요.", body?.error?.code));
        return;
      }
      resolve(body.data);
    };
    const form = new FormData();
    form.append("file", file, fileName);
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
  if (path === "/partner/venues" && method === "POST") return venue as T;
  if (path === "/partner/venues") return (kind === "novenue" ? [] : [venue, { ...venue, id: 2, name: "멍멍 호텔 성수", checkinCode: "zz9", checkinUrl: "https://pawstamp.rubi-on.com/i/checkin/zz9" }]) as T;
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

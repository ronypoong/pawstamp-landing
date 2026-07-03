// 공개 공지사항 fetch. 홈페이지는 무인증으로 BE의 /api/v1/public/announcements 를 호출한다.
// BE의 ApiResponse 래퍼는 { data: ... } 형태라 .data를 꺼낸다.

export type AnnouncementCategory = "NOTICE" | "MAINTENANCE" | "EVENT";

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  NOTICE: "공지",
  MAINTENANCE: "점검",
  EVENT: "이벤트",
};

export interface AnnouncementSummary {
  id: string;
  category: AnnouncementCategory;
  title: string;
  pinned: boolean;
  publishedAt: string | null;
}

export interface Announcement extends AnnouncementSummary {
  content: string | null;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://paw.rubi-on.com/api/v1";

export async function fetchAnnouncements(limit = 50): Promise<AnnouncementSummary[]> {
  const res = await fetch(`${API_BASE_URL}/public/announcements?limit=${limit}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`공지사항을 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { data?: AnnouncementSummary[] };
  return body?.data ?? [];
}

export async function fetchAnnouncement(id: string): Promise<Announcement> {
  const res = await fetch(`${API_BASE_URL}/public/announcements/${id}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`공지사항을 불러오지 못했습니다 (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { data?: Announcement };
  if (!body?.data) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  return body.data;
}

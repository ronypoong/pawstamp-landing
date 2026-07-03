import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  fetchAnnouncement,
  type Announcement,
} from "../lib/announcementsApi";

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : DATE_FORMATTER.format(d);
}

export function AnnouncementDetailPage() {
  const { announcementId = "" } = useParams();
  const [doc, setDoc] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    fetchAnnouncement(announcementId)
      .then((data) => {
        if (!cancelled) {
          setDoc(data);
          document.title = `${data.title} — 발도장`;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "공지사항을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  if (error) {
    return (
      <article className="privacy-page">
        <h1>공지사항을 불러올 수 없습니다</h1>
        <p className="updated">{error}</p>
        <p><Link className="notice-back" to="/notice">← 공지사항 목록</Link></p>
      </article>
    );
  }

  if (!doc) {
    return (
      <article className="privacy-page">
        <h1>공지사항</h1>
        <p className="updated">공지사항을 불러오는 중...</p>
      </article>
    );
  }

  return (
    <article className="privacy-page">
      <p><Link className="notice-back" to="/notice">← 공지사항 목록</Link></p>
      <div className="notice-detail__meta">
        <span className={`notice-badge notice-badge--${doc.category.toLowerCase()}`}>
          {ANNOUNCEMENT_CATEGORY_LABELS[doc.category]}
        </span>
        <span className="notice-item__date">{formatDate(doc.publishedAt)}</span>
      </div>
      <h1>{doc.title}</h1>
      <div className="terms-body">{doc.content}</div>
    </article>
  );
}

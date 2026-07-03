import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  fetchAnnouncements,
  type AnnouncementSummary,
} from "../lib/announcementsApi";

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : DATE_FORMATTER.format(d);
}

export function AnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "공지사항 — 발도장";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    fetchAnnouncements()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "공지사항을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="privacy-page">
      <h1>공지사항</h1>
      <p className="updated">발도장의 새로운 소식과 안내를 확인하세요.</p>

      {error ? (
        <p className="notice-empty">{error}</p>
      ) : !items ? (
        <p className="notice-empty">공지사항을 불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="notice-empty">등록된 공지사항이 없습니다.</p>
      ) : (
        <ul className="notice-list">
          {items.map((item) => (
            <li key={item.id} className="notice-item">
              <Link to={`/notice/${item.id}`} className="notice-item__link">
                <span className={`notice-badge notice-badge--${item.category.toLowerCase()}`}>
                  {ANNOUNCEMENT_CATEGORY_LABELS[item.category]}
                </span>
                <span className="notice-item__title">
                  {item.pinned ? <span className="notice-pin" aria-label="상단 고정">📌</span> : null}
                  {item.title}
                </span>
                <span className="notice-item__date">{formatDate(item.publishedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

import { useState } from "react";
import type { HoursDay, TagDef, Venue, VenuePhoto, VenueProfileInput } from "../../lib/partnerApi";

const KST_DAYS: HoursDay[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function todayKst(): HoursDay {
  return KST_DAYS[new Date(Date.now() + 9 * 3600_000).getUTCDay()];
}

/** 앱 목록 태그 순서와 같게: 미리 정한 태그(선택 순) → 직접 태그. */
function tagLabels(draft: VenueProfileInput, defs: TagDef[]): string[] {
  const preset = draft.tags.preset.map((c) => defs.find((d) => d.code === c)?.label).filter((l): l is string => !!l);
  return [...preset, ...draft.tags.custom];
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function PlaceholderPhoto({ small }: { small?: boolean }) {
  return (
    <div className={`ap-photo-empty${small ? " is-small" : ""}`} aria-hidden>
      <svg width={small ? 22 : 36} height={small ? 22 : 36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="M21 16l-5-5-8 8" />
      </svg>
      {!small && <span>대표 사진을 올려 주세요</span>}
    </div>
  );
}

/**
 * "앱에서 이렇게 보여요" 실시간 미리보기 — 앱 리디자인(크림·코코아·도장색) 나들이 카드 + 상세 첫 화면 축소판.
 * 앱 토큰(--rd-*)을 이 영역에만 로컬로 정의해 랜딩 토큰과 섞지 않는다.
 */
export function AppPreview({
  venue,
  draft,
  photos,
  tagDefs,
  hidden,
}: {
  venue: Venue;
  draft: VenueProfileInput;
  photos: VenuePhoto[];
  tagDefs: TagDef[];
  hidden: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const tags = tagLabels(draft, tagDefs);
  const cover = photos[0];
  const current = photos[Math.min(idx, Math.max(0, photos.length - 1))];
  const today = todayKst();
  const todayHours = draft.hours.find((h) => h.day === today);
  const tagline = draft.tagline?.trim();
  const description = draft.description?.trim();
  const hasInsta = !!draft.instagramUrl?.trim();
  const hasPhone = !!draft.phone?.trim();

  return (
    <div className="ap">
      <p className="ap-title">앱에서 이렇게 보여요</p>
      {hidden && <p className="ap-hidden">지금은 운영자가 숨겨 앱에 보이지 않아요</p>}
      {venue.petCafeId == null && (
        <p className="ap-note">아직 나들이 장소와 연결되지 않은 매장이에요. 연결되면 앱 목록에 이렇게 보여요.</p>
      )}

      <p className="ap-caption">나들이 목록</p>
      <div className="ap-card">
        {cover ? <img className="ap-thumb" src={cover.thumbnailUrl || cover.url} alt="" /> : <PlaceholderPhoto small />}
        <div className="ap-card-body">
          <div className="ap-card-name">
            <span>{venue.name}</span>
            {venue.active && <span className="ap-badge">체크인</span>}
          </div>
          {/* 앱과 같게: 한 줄 소개가 없으면 카테고리 · 주소 */}
          <p className="ap-card-tagline">{tagline || [venue.category, venue.address].filter(Boolean).join(" · ")}</p>
          {tags.length > 0 && (
            <div className="ap-tags ap-tags--row">
              {tags.slice(0, 2).map((t) => (
                <span key={t} className="ap-tag">
                  {t}
                </span>
              ))}
              {tags.length > 2 && <span className="ap-tag">+{tags.length - 2}</span>}
            </div>
          )}
        </div>
        <span className="ap-pin" aria-hidden>
          <PinIcon />
        </span>
      </div>
      {!tagline && <p className="ap-hint">한 줄 소개를 넣으면 주소 대신 이 자리에 보여요</p>}

      <p className="ap-caption">매장 상세</p>
      <div className="ap-sheet">
        <div className="ap-hero">
          {current ? <img src={current.url} alt="" /> : <PlaceholderPhoto />}
          {photos.length > 1 && (
            <>
              <span className="ap-hero-count">
                {Math.min(idx, photos.length - 1) + 1}/{photos.length}
              </span>
              <div className="ap-dots">
                {photos.map((p, i) => (
                  <button key={p.id} type="button" aria-label={`${i + 1}번째 사진`} className={i === Math.min(idx, photos.length - 1) ? "is-on" : undefined} onClick={() => setIdx(i)} />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="ap-sheet-body">
          <h3 className="ap-name">{venue.name}</h3>
          <p className="ap-meta">{[venue.category, venue.address].filter(Boolean).join(" · ")}</p>
          {tagline && <p className="ap-tagline">{tagline}</p>}
          {todayHours && (
            <p className="ap-hours">
              <b>오늘</b> {todayHours.closed ? "쉬는 날" : `${todayHours.open} ~ ${todayHours.close}`}
              {draft.hoursNote?.trim() && <span> · {draft.hoursNote.trim()}</span>}
            </p>
          )}
          {tags.length > 0 && (
            <div className="ap-tags">
              {tags.map((t) => (
                <span key={t} className="ap-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="ap-actions">
            {hasPhone && <span className="ap-action">전화</span>}
            {hasInsta && <span className="ap-action">인스타그램</span>}
            <span className="ap-action ap-action--primary">
              <PinIcon />
              길찾기
            </span>
          </div>
          {description && <p className="ap-desc">{description}</p>}
        </div>
      </div>
    </div>
  );
}

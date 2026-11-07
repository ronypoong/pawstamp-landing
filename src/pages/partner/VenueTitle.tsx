import { Link } from "react-router-dom";
import { usePartner } from "./PartnerLayout";

/**
 * 다매장 명확화: 페이지 제목에 현재 매장명을 크게 + [매장 바꾸기](2개 이상일 때) + [+ 매장 추가].
 * 헤더의 매장 선택기와 같은 상태(selectVenue)를 쓴다.
 */
export function VenueTitle({ suffix, sub }: { suffix: string; sub?: string }) {
  const { venue, venues, selectVenue, confirmLeave } = usePartner();
  if (!venue) return null;
  return (
    <header className="p-page-head vt">
      <div className="vt-row">
        <h1 className="p-title vt-title">
          <span className="vt-venue">{venue.name}</span> <span className="vt-suffix">{suffix}</span>
        </h1>
        <div className="vt-actions">
          {venues.length > 1 && (
            <label className="vt-switch">
              <span className="sr-only">매장 바꾸기</span>
              <select
                value={venue.id}
                onChange={(e) => {
                  if (!confirmLeave()) return;
                  selectVenue(Number(e.target.value));
                }}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <span className="vt-switch-label" aria-hidden>
                매장 바꾸기
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </label>
          )}
          {venues.length > 1 && <span className="vt-divider" aria-hidden />}
          <Link
            className="p-btn p-btn--text p-btn--sm vt-add"
            to="/partner/venues/new"
            onClick={(e) => {
              if (!confirmLeave()) e.preventDefault();
            }}
          >
            + 매장 추가
          </Link>
        </div>
      </div>
      {sub && <p className="p-sub">{sub}</p>}
    </header>
  );
}

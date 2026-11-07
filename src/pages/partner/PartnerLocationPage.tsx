import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PartnerApiError, setVenuePlace, type NaverPlace } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";
import { PlaceFinder } from "./PlaceFinder";

/** 지도 위치 연결(/partner/location): 좌표 없이 등록된 매장을 네이버 장소·주소로 연결. */
export function PartnerLocationPage() {
  const { venue, venues, reloadVenues, handleAuthError, selectVenue } = usePartner();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "지도 위치 연결 — 발도장 파트너";
  }, []);

  if (!venue) return null;

  async function pick(p: NaverPlace) {
    if (!venue) return;
    setBusy(true);
    setError(null);
    try {
      // 기존 나들이 장소와 같은 곳(이름·50m)이면 BE 가 그 장소에 연결한다.
      await setVenuePlace(venue.id, { naverPlace: p });
      await reloadVenues();
      setDone(true);
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e instanceof PartnerApiError ? e.message : "연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        <h1 className="p-title">지도 위치 연결</h1>
        <p className="p-sub">
          <b>{venue.name}</b>의 위치를 찾아 주세요. 연결하면 발도장 앱 지도와 나들이 목록에 우리 매장이 표시돼요.
        </p>
      </header>

      {done || venue.hasLocation === true ? (
        <section className="p-card vf-state" role="status">
          <span className="vf-badge vf-badge--ok">위치 연결됨</span>
          <p className="vf-state-title">지도 위치가 연결됐어요</p>
          <p className="p-sub">사업자 인증까지 끝나면 발도장 앱 지도에 보여요.</p>
          <Link className="p-btn p-btn--primary p-btn--block" to="/partner/dashboard">
            방문 현황으로
          </Link>
          {venues.some((v) => v.id !== venue.id && v.hasLocation === false) && (
            <button
              type="button"
              className="p-link p-link--center"
              onClick={() => {
                const next = venues.find((v) => v.id !== venue.id && v.hasLocation === false);
                if (next) {
                  setDone(false);
                  selectVenue(next.id);
                }
              }}
            >
              다른 매장도 연결하기
            </button>
          )}
        </section>
      ) : (
        <section className="p-card">
          <PlaceFinder initialQuery={venue.name} submitLabel="이 위치로 연결하기" busy={busy} onPick={(p) => void pick(p)} />
          {error && <p className="p-error" role="alert">{error}</p>}
        </section>
      )}
    </div>
  );
}

/** 좌표 없는 매장 안내 배너(대시보드 상단 등). */
export function LocationMissingBanner() {
  const { venue } = usePartner();
  if (!venue || venue.hasLocation !== false) return null;
  return (
    <div className="p-banner p-banner--warn pfd-banner" role="status">
      <div>
        <b>지도 위치가 연결되지 않았어요.</b> 위치를 연결해야 발도장 앱 지도에 우리 매장이 보여요.
      </div>
      <Link className="p-btn p-btn--primary" to="/partner/location">
        지도 위치 연결하기
      </Link>
    </div>
  );
}

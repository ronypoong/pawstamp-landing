import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import type { Venue } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

const StaticMap = lazy(() => import("./StaticMap"));

/** 매장의 현재 지도 위치(작은 정적 지도 + 주소) + 위치 바꾸기. 내 정보·매장 꾸미기에서 사용. */
export function VenueLocationCard({ venue, compact }: { venue: Venue; compact?: boolean }) {
  const { selectVenue, confirmLeave } = usePartner();
  const loc = venue.location ?? null;
  const to = `/partner/location?venue=${venue.id}`;
  const onGo = (e: React.MouseEvent) => {
    if (!confirmLeave()) {
      e.preventDefault();
      return;
    }
    selectVenue(venue.id);
  };

  if (!loc) {
    return (
      <div className={`vl vl--empty${compact ? " vl--compact" : ""}`}>
        <div className="vl-text">
          <span className="p-label">지도 위치</span>
          <span className="vl-empty">아직 지도 위치가 없어 발도장 앱 지도에 보이지 않아요.</span>
        </div>
        <Link className="p-btn p-btn--ghost p-btn--sm" to={to} onClick={onGo}>
          지도 위치 연결하기
        </Link>
      </div>
    );
  }

  const address = loc.roadAddress || loc.address;
  return (
    <div className={`vl${compact ? " vl--compact" : ""}`}>
      <Suspense fallback={<div className="pass-skeleton sm" aria-hidden />}>
        <StaticMap lat={loc.latitude} lng={loc.longitude} />
      </Suspense>
      <div className="vl-row">
        <div className="vl-text">
          <span className="p-label">지도 위치</span>
          {loc.name && <span className="vl-name">{loc.name}</span>}
          {address && <span className="vl-address">{address}</span>}
          {!loc.editable && <span className="vl-public">발도장 나들이 장소에 연결돼 있어요</span>}
        </div>
        <Link className="p-btn p-btn--ghost p-btn--sm" to={to} onClick={onGo}>
          {loc.editable ? "위치 바꾸기" : "다른 장소로 연결 바꾸기"}
        </Link>
      </div>
    </div>
  );
}

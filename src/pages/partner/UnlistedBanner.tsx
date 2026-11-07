import { useState } from "react";
import { PartnerApiError, isListed, updateVenue } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

/** 앱 표시가 꺼진 매장: 대시보드·꾸미기·포스터 상단 안내 + 바로 다시 켜기(켤 때는 확인 없이). */
export function UnlistedBanner() {
  const { venue, reloadVenues, handleAuthError } = usePartner();
  const [busy, setBusy] = useState(false);
  if (!venue || isListed(venue)) return null;

  async function relist() {
    if (!venue) return;
    setBusy(true);
    try {
      await updateVenue(venue.id, { listed: true });
      await reloadVenues();
    } catch (e) {
      if (!handleAuthError(e)) window.alert(e instanceof PartnerApiError ? e.message : "다시 켜지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-banner p-banner--warn ul-banner no-print" role="status">
      <div>
        <b>지금 발도장 앱에 표시되지 않아요.</b> 나들이 목록·지도에서 숨겨져 있고 QR 체크인도 멈춰 있어요.
      </div>
      <button type="button" className="p-btn p-btn--ghost p-btn--sm" disabled={busy} onClick={() => void relist()}>
        {busy ? "켜는 중…" : "다시 켜기"}
      </button>
    </div>
  );
}

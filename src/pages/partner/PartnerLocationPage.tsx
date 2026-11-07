import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PLACE_TYPES,
  PartnerApiError,
  guessPlaceType,
  setVenuePlace,
  verificationStep,
  type NaverPlace,
  type PlaceTypeCode,
} from "../../lib/partnerApi";
import { MapPinField, isInKorea, type LatLng } from "./MapPinField";
import { usePartner } from "./PartnerLayout";
import { PlaceFinder } from "./PlaceFinder";

/**
 * 지도 위치 연결·변경(/partner/location?venue=id).
 * 위치 없는 매장은 연결, 이미 위치가 있으면 기존 위치에서 시작해 바꾸기.
 */
export function PartnerLocationPage() {
  const { venue, venues, reloadVenues, handleAuthError, selectVenue } = usePartner();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState<"search" | "pin">("search");
  const [pin, setPin] = useState<LatLng | null>(null);
  const [pinType, setPinType] = useState<PlaceTypeCode>(() => guessPlaceType(venue?.category));

  const [params] = useSearchParams();

  useEffect(() => {
    document.title = "지도 위치 — 발도장 파트너";
  }, []);

  // ?venue=id 로 들어오면 그 매장을 선택(헤더 선택기와 동기화)
  useEffect(() => {
    const id = Number(params.get("venue"));
    if (id && venues.some((v) => v.id === id) && venue?.id !== id) selectVenue(id);
  }, [params, venues, venue?.id, selectVenue]);

  // 매장이 바뀌면 화면 상태 초기화
  useEffect(() => {
    setDone(false);
    setPin(null);
    setError(null);
  }, [venue?.id]);

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

  const loc = venue.location ?? null;
  const hasLoc = !!loc || venue.hasLocation === true;
  const changing = hasLoc && !done;
  const current: LatLng | null = loc ? { lat: loc.latitude, lng: loc.longitude } : null;
  // 기존 위치와 거의 같으면(약 5m 이내) 저장할 게 없으므로 버튼을 끈다
  const pinChanged =
    !current || !pin || Math.abs(pin.lat - current.lat) > 0.00005 || Math.abs(pin.lng - current.lng) > 0.00005;

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        <h1 className="p-title">
          <span className="vt-venue">{venue.name}</span> <span className="vt-suffix">{changing ? "위치 바꾸기" : "지도 위치"}</span>
        </h1>
        <p className="p-sub">
          {changing
            ? loc && !loc.editable
              ? "지금은 발도장 나들이 장소에 연결돼 있어요. 다른 장소를 찾아 연결을 바꿀 수 있어요."
              : "새 위치를 찾거나 지도에서 직접 찍어 주세요. 저장하면 발도장 앱 지도에 바로 반영돼요."
            : "위치를 찾아 주세요. 연결하면 발도장 앱 지도와 나들이 목록에 우리 매장이 표시돼요."}
        </p>
        {changing && loc && (
          <p className="loc-current">
            <span className="p-label">현재 위치</span>
            {[loc.name, loc.roadAddress || loc.address].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      {done ? (
        <section className="p-card vf-state" role="status">
          <span className="vf-badge vf-badge--ok">위치 연결됨</span>
          <p className="vf-state-title">지도 위치를 저장했어요</p>
          <p className="p-sub">
            {verificationStep(venue) === "verified" ? "발도장 앱 지도에 바로 반영돼요." : "사업자 인증까지 끝나면 발도장 앱 지도에 보여요."}
          </p>
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
          <div className="p-segment p-segment--sm pfd-seg" role="tablist" aria-label="위치 찾는 방법">
            <button type="button" role="tab" aria-selected={tab === "search"} className={tab === "search" ? "active" : undefined} onClick={() => setTab("search")}>
              검색으로 찾기
            </button>
            <button type="button" role="tab" aria-selected={tab === "pin"} className={tab === "pin" ? "active" : undefined} onClick={() => setTab("pin")}>
              지도에서 직접 찍기
            </button>
          </div>
          {tab === "search" ? (
            <PlaceFinder
              initialQuery={venue.name}
              submitLabel={changing ? "이 위치로 바꾸기" : "이 위치로 연결하기"}
              busy={busy}
              onPick={(p) => void pick(p)}
            />
          ) : (
            <>
              <MapPinField initial={current} originLabel="기존 위치" value={pin} onChange={setPin} />
              <label className="p-field pfd-pin-type">
                <span className="p-label">업종</span>
                <select className="p-input" value={pinType} onChange={(e) => setPinType(e.target.value as PlaceTypeCode)}>
                  {PLACE_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {current && !pinChanged && <p className="p-hint loc-pin-hint">핀을 옮기면 버튼이 켜져요.</p>}
              <button
                type="button"
                className="p-btn p-btn--primary p-btn--block"
                disabled={busy || !pin || !pinChanged}
                onClick={() => {
                  if (!pin) return;
                  if (!isInKorea(pin) && !window.confirm("찍은 위치가 한국 밖이에요. 이대로 연결할까요?")) return;
                  void pick({
                    name: venue.name,
                    address: venue.address,
                    roadAddress: venue.address,
                    latitude: pin.lat,
                    longitude: pin.lng,
                    category: pinType,
                    link: null,
                    existingPetCafeId: null,
                    claimed: false,
                  });
                }}
              >
                {busy ? "저장 중…" : changing ? "이 위치로 바꾸기" : "이 위치로 연결하기"}
              </button>
            </>
          )}
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

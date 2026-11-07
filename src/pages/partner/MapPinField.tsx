import { Suspense, lazy } from "react";
import type { LatLng } from "./MapPinPicker";

// leaflet(번들·CSS)은 지도를 여는 순간에만 받는다.
const MapPinPicker = lazy(() => import("./MapPinPicker"));

/** 서울시청 — 후보 좌표·브라우저 위치가 없을 때 시작점 */
export const SEOUL_CITY_HALL: LatLng = { lat: 37.5665, lng: 126.978 };

/** 대한민국 대략 범위(제주·울릉·독도 포함) */
export function isInKorea(c: LatLng): boolean {
  return c.lat >= 33 && c.lat <= 38.7 && c.lng >= 124.5 && c.lng <= 132;
}

export type { LatLng };

/** 두 좌표 거리(m, 하버사인) — leaflet 없이 계산해 지연 로딩 유지 */
function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 지도 핀 찍기 + 안내·범위 경고. value 는 현재 지도 중심. */
export function MapPinField({
  initial,
  value,
  onChange,
}: {
  initial: LatLng | null;
  value: LatLng | null;
  onChange: (c: LatLng) => void;
}) {
  return (
    <div className="mpf">
      <p className="p-hint mpf-hint">지도를 손가락으로 끌어 가운데 핀 끝을 매장 입구에 맞춰 주세요.</p>
      <Suspense fallback={<div className="pass-skeleton mp-skeleton" aria-busy="true" aria-label="지도 불러오는 중" />}>
        <MapPinPicker initial={initial} fallback={SEOUL_CITY_HALL} onChange={onChange} />
      </Suspense>
      {/* 지도 아래 상태 한 줄: 한국 밖이면 경고, 아니면 안심 피드백 */}
      {value && !isInKorea(value) ? (
        <p className="p-error mpf-warn" role="alert">
          지금 위치가 한국 밖이에요. 매장 위치가 맞는지 다시 확인해 주세요.
        </p>
      ) : value ? (
        <p className="p-hint mpf-status" aria-live="polite">
          {initial
            ? distanceM(initial, value) <= 5
              ? "검색된 위치 그대로예요"
              : `검색된 위치에서 약 ${Math.round(distanceM(initial, value))}m 옮겼어요`
            : "가운데 핀 위치로 등록돼요"}
        </p>
      ) : null}
    </div>
  );
}

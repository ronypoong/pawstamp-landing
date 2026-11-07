import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * 지도 중앙 고정 핀 방식 위치 찍기(Leaflet + OSM 타일). 지도를 움직이면 중심 좌표가 곧 위치.
 * 이 모듈은 지도 화면에서만 lazy import 된다(leaflet 번들·CSS 분리).
 * initial 이 없으면 브라우저 위치(실패 무시) → 그것도 없으면 호출부가 준 fallback(서울시청)에서 시작.
 */
export default function MapPinPicker({
  initial,
  fallback,
  onChange,
}: {
  initial: LatLng | null;
  fallback: LatLng;
  onChange: (c: LatLng) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!boxRef.current) return;
    const start = initial ?? fallback;
    const map = L.map(boxRef.current, {
      center: [start.lat, start.lng],
      zoom: initial ? 18 : 16,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 기여자',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    const emit = () => {
      const c = map.getCenter();
      onChangeRef.current({ lat: c.lat, lng: c.lng });
    };
    map.on("movestart", () => setMoving(true));
    map.on("moveend", () => {
      setMoving(false);
      emit();
    });
    emit();
    mapRef.current = map;
    // 컨테이너가 접힘/펼침으로 나타난 직후 크기 재계산
    const t = window.setTimeout(() => map.invalidateSize(), 50);

    if (!initial) locate(map, true);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // 최초 1회만 생성(시작 위치는 이후 사용자가 지도로 바꿈)
  }, []);

  function locate(map: L.Map | null, silent: boolean) {
    if (!map || !("geolocation" in navigator)) {
      if (!silent) setLocateFailed(true);
      return;
    }
    setLocating(true);
    setLocateFailed(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        map.setView([pos.coords.latitude, pos.coords.longitude], 18);
      },
      () => {
        setLocating(false);
        if (!silent) setLocateFailed(true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <div className={`mp${moving ? " is-moving" : ""}`}>
      <div ref={boxRef} className="mp-map" role="application" aria-label="지도: 움직여서 매장 위치를 가운데 핀에 맞춰 주세요" />
      {/* 중앙 고정 핀: 끝점이 정확히 중심에 오도록 아래로 붙임 */}
      <div className="mp-dot" aria-hidden />
      <div className="mp-pin" aria-hidden>
        <svg width="36" height="46" viewBox="0 0 36 46">
          <path d="M18 45s15-15.5 15-27A15 15 0 0 0 3 18c0 11.5 15 27 15 27z" style={{ fill: "var(--seal)" }} stroke="#fff" strokeWidth="2" />
          <circle cx="18" cy="18" r="5.5" fill="#fff" />
        </svg>
      </div>
      <div className="mp-controls">
        <button type="button" aria-label="확대" onClick={() => mapRef.current?.zoomIn()}>
          +
        </button>
        <button type="button" aria-label="축소" onClick={() => mapRef.current?.zoomOut()}>
          −
        </button>
      </div>
      {/* 미세 조정(시작 좌표 있음)에선 '내 위치'가 엉뚱한 곳(집·사무실)으로 보낼 수 있어 '검색 위치로 되돌리기' */}
      {initial ? (
        <button type="button" className="mp-locate" onClick={() => mapRef.current?.setView([initial.lat, initial.lng], 18)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          검색 위치로 되돌리기
        </button>
      ) : (
        <button type="button" className="mp-locate" onClick={() => locate(mapRef.current, false)} disabled={locating}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {locating ? "찾는 중…" : "내 위치로"}
        </button>
      )}
      {locateFailed && <p className="mp-toast">현재 위치를 가져오지 못했어요. 지도를 직접 움직여 주세요.</p>}
    </div>
  );
}

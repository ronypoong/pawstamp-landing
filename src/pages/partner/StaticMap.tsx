import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** 위치 확인용 작은 정적 지도(조작 불가, 중앙 핀 고정). lazy import 전용 모듈. */
export default function StaticMap({ lat, lng }: { lat: number; lng: number }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boxRef.current) return;
    const map = L.map(boxRef.current, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomAnimation: false,
      fadeAnimation: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    const t = window.setTimeout(() => map.invalidateSize(), 50);
    return () => {
      window.clearTimeout(t);
      map.off();
      map.remove();
    };
  }, [lat, lng]);

  return (
    <div className="sm">
      <div ref={boxRef} className="sm-map" aria-hidden />
      <div className="mp-pin sm-pin" aria-hidden>
        <svg width="28" height="36" viewBox="0 0 36 46">
          <path d="M18 45s15-15.5 15-27A15 15 0 0 0 3 18c0 11.5 15 27 15 27z" style={{ fill: "var(--seal)" }} stroke="#fff" strokeWidth="2" />
          <circle cx="18" cy="18" r="5.5" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}

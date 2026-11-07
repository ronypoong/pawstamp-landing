import { useEffect, useState, type FormEvent } from "react";
import {
  PLACE_TYPES,
  PartnerApiError,
  guessPlaceType,
  naverMapUrl,
  searchNaverPlaces,
  type NaverPlace,
  type PlaceSearchType,
  type PlaceTypeCode,
} from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

type SearchState = { kind: "idle" } | { kind: "loading" } | { kind: "done"; items: NaverPlace[] } | { kind: "error"; message: string };

/**
 * 지도 위치 찾기: 네이버 장소 검색 → (없으면) 도로명 주소 검색 → (그래도 없으면) onManual.
 * 매장 등록(직접 입력 대체)과 '지도 위치 연결하기'에서 같이 쓴다.
 */
export function PlaceFinder({
  initialQuery,
  submitLabel,
  busy,
  onPick,
  onManual,
  onBack,
  backLabel,
}: {
  /** 카드 맨 위 '← …' 되돌아가기 */
  onBack?: () => void;
  backLabel?: string;
  initialQuery: string;
  submitLabel: string;
  busy: boolean;
  onPick: (place: NaverPlace) => void;
  /** 주소로도 못 찾을 때 마지막 수단(없으면 링크 숨김) */
  onManual?: () => void;
}) {
  const { handleAuthError } = usePartner();
  const [type, setType] = useState<PlaceSearchType>("place");
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [picked, setPicked] = useState<NaverPlace | null>(null);
  /** 선택한 후보의 업종(BE 장소 유형 코드). 네이버 카테고리로 기본값 추정, 사장님이 고칠 수 있음. */
  const [placeType, setPlaceType] = useState<PlaceTypeCode>("cafe");

  async function run(q: string, t: PlaceSearchType) {
    const v = q.trim();
    if (v.length < 2) {
      setSearch({ kind: "error", message: t === "place" ? "매장 이름을 2자 이상 입력해 주세요." : "도로명 주소를 입력해 주세요." });
      return;
    }
    setSearch({ kind: "loading" });
    setPicked(null);
    try {
      setSearch({ kind: "done", items: await searchNaverPlaces(v, t) });
    } catch (e) {
      if (handleAuthError(e)) return;
      setSearch({ kind: "error", message: e instanceof PartnerApiError ? e.message : "검색하지 못했어요. 잠시 후 다시 시도해 주세요." });
    }
  }

  // 처음 열릴 때 매장명으로 바로 검색
  useEffect(() => {
    if (initialQuery.trim().length >= 2) void run(initialQuery, "place");
    // 최초 1회만(검색어는 이후 사용자가 바꿈)
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(query, type);
  }

  function switchType(t: PlaceSearchType) {
    if (t === type) return;
    setType(t);
    setQuery(t === "place" ? initialQuery : "");
    setSearch({ kind: "idle" });
    setPicked(null);
  }

  const items = search.kind === "done" ? search.items : [];

  return (
    <div className="pfd">
      {onBack && (
        <button type="button" className="p-link pfd-back" onClick={onBack}>
          ← {backLabel ?? "뒤로"}
        </button>
      )}
      <div className="p-segment p-segment--sm pfd-seg" role="radiogroup" aria-label="찾는 방법">
        <button type="button" role="radio" aria-checked={type === "place"} className={type === "place" ? "active" : undefined} onClick={() => switchType("place")}>
          매장 이름
        </button>
        <button type="button" role="radio" aria-checked={type === "address"} className={type === "address" ? "active" : undefined} onClick={() => switchType("address")}>
          도로명 주소
        </button>
      </div>
      <form className="pfd-search" onSubmit={submit}>
        <label className="p-field pfd-field">
          <span className="p-label">{type === "place" ? "네이버 지도에서 매장 찾기" : "도로명 주소로 찾기"}</span>
          <span className="pfd-row">
            <input
              className="p-input"
              placeholder={type === "place" ? "예) 멍멍 플레이그라운드 성수" : "예) 성수이로 00"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus={type === "address"}
            />
            <button type="submit" className="p-btn p-btn--ghost" disabled={search.kind === "loading"}>
              찾기
            </button>
          </span>
        </label>
      </form>

      {search.kind === "loading" && <p className="p-hint">찾는 중…</p>}
      {search.kind === "error" && <p className="p-error">{search.message}</p>}
      {search.kind === "done" && items.length === 0 && (
        <p className="p-hint">
          {type === "place" ? (
            <>
              네이버 지도에서 찾지 못했어요. 이름을 바꿔 보거나{" "}
              <button type="button" className="p-link pfd-inline" onClick={() => switchType("address")}>
                도로명 주소로 찾아
              </button>{" "}
              주세요.
            </>
          ) : (
            "주소를 찾지 못했어요. 도로명과 건물번호까지 적어 주세요."
          )}
        </p>
      )}

      {items.length > 0 && (
        <ul className="p-place-list" role="listbox" aria-label="위치 후보">
          {items.map((p, i) => {
            const selected = picked === p;
            return (
              <li key={`${p.name}-${p.latitude}-${p.longitude}-${i}`} className={`pfd-item${selected ? " is-selected" : ""}${p.claimed ? " is-disabled" : ""}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`p-place${selected ? " is-selected" : ""}`}
                  disabled={p.claimed}
                  onClick={() => {
                    setPicked(p);
                    setPlaceType(guessPlaceType(p.category));
                  }}
                >
                  <span className="p-place-name pfd-name">
                    {p.name}
                    {selected && (
                      <span className="pfd-check" aria-label="선택됨">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="p-place-meta">{[p.category, p.roadAddress || p.address].filter(Boolean).join(" · ")}</span>
                  {p.roadAddress && p.address && <span className="p-place-meta pfd-jibun">지번 {p.address}</span>}
                  {p.claimed && <span className="p-place-claimed">이미 다른 사장님이 등록한 매장이에요</span>}
                  {!p.claimed && p.existingPetCafeId != null && <span className="pfd-known">발도장 나들이 장소에 있는 곳이에요</span>}
                </button>
                {selected && (
                  <label className="pfd-type">
                    <span className="p-label">업종</span>
                    <select className="p-input" value={placeType} onChange={(e) => setPlaceType(e.target.value as PlaceTypeCode)}>
                      {PLACE_TYPES.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <span className="p-hint pfd-field-hint">발도장 앱 나들이 목록에서 이 업종으로 분류돼요.</span>
                  </label>
                )}
                <a className="pfd-map" href={naverMapUrl(p)} target="_blank" rel="noopener noreferrer">
                  네이버 지도에서 보기 ↗
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {picked && (
        <button
          type="button"
          className="p-btn p-btn--primary p-btn--block pfd-submit"
          disabled={busy}
          onClick={() => onPick({ ...picked, category: placeType })}
        >
          {busy ? "처리 중…" : submitLabel}
        </button>
      )}

      {onManual && type === "address" && search.kind === "done" && (
        <div className="pfd-fallbacks">
          <button type="button" className="p-link p-link--center" onClick={onManual}>
            주소로도 안 나와요 · 위치 없이 직접 입력
          </button>
        </div>
      )}
    </div>
  );
}

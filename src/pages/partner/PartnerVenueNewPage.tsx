import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PartnerApiError, createVenue, searchPlaces, type CreateVenueInput, type PlaceSearchItem } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

const CATEGORIES = ["애견카페", "애견동반 카페·식당", "애견호텔·유치원", "애견미용", "동물병원", "펫용품점", "운동장·놀이터", "기타"];

type SearchState = { kind: "idle" } | { kind: "loading" } | { kind: "done"; items: PlaceSearchItem[] } | { kind: "error" };

/** 매장 등록: 기존 나들이 장소에서 찾아 연결하거나, 없으면 직접 입력. */
export function PartnerVenueNewPage() {
  const navigate = useNavigate();
  const { venues, reloadVenues, selectVenue, handleAuthError } = usePartner();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [picked, setPicked] = useState<PlaceSearchItem | null>(null);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", category: CATEGORIES[0], phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "매장 등록 — 발도장 파트너";
  }, []);

  // 입력 300ms 디바운스 검색(2자 이상).
  useEffect(() => {
    const q = query.trim();
    if (manual || q.length < 2) {
      setSearch({ kind: "idle" });
      return;
    }
    let alive = true;
    setSearch({ kind: "loading" });
    const t = window.setTimeout(() => {
      searchPlaces(q)
        .then((items) => alive && setSearch({ kind: "done", items }))
        .catch((e) => {
          if (!alive || handleAuthError(e)) return;
          setSearch({ kind: "error" });
        });
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query, manual, handleAuthError]);

  async function submit(input: CreateVenueInput) {
    setBusy(true);
    setError(null);
    try {
      const venue = await createVenue(input);
      await reloadVenues();
      selectVenue(venue.id);
      navigate("/partner/poster?welcome=1", { replace: true });
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e instanceof PartnerApiError ? e.message : "등록하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  function submitManual(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) {
      setError("매장 이름과 주소를 입력해 주세요.");
      return;
    }
    void submit({
      name: form.name.trim(),
      address: form.address.trim(),
      category: form.category,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    });
  }

  function startManual() {
    setManual(true);
    setPicked(null);
    setError(null);
    setForm((f) => ({ ...f, name: f.name || query.trim() }));
  }

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        <p className="p-eyebrow">{venues.length === 0 ? "1단계 · 매장 등록" : "매장 추가"}</p>
        <h1 className="p-title">어떤 매장인가요?</h1>
        <p className="p-sub">
          발도장 나들이 장소에 이미 있는 매장이면 연결해 주세요. 앱에서 우리 매장을 본 횟수까지 함께 보여드려요.
        </p>
      </header>

      {!manual && (
        <section className="p-card">
          <label className="p-field">
            <span className="p-label">매장 이름</span>
            <input
              className="p-input"
              placeholder="예) 멍멍 플레이그라운드"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
              }}
              autoFocus
            />
          </label>

          {search.kind === "loading" && <p className="p-hint">찾는 중…</p>}
          {search.kind === "error" && <p className="p-error">검색하지 못했어요. 잠시 후 다시 입력해 주세요.</p>}
          {search.kind === "done" && search.items.length === 0 && (
            <p className="p-hint">나들이 장소에서 찾지 못했어요. 아래에서 직접 입력해 주세요.</p>
          )}

          {search.kind === "done" && search.items.length > 0 && (
            <ul className="p-place-list" role="listbox" aria-label="검색 결과">
              {search.items.map((p) => {
                const selected = picked?.petCafeId === p.petCafeId;
                return (
                  <li key={p.petCafeId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`p-place${selected ? " is-selected" : ""}`}
                      disabled={p.claimed}
                      onClick={() => setPicked(p)}
                    >
                      <span className="p-place-name">{p.name}</span>
                      <span className="p-place-meta">{[p.category, p.address].filter(Boolean).join(" · ")}</span>
                      {p.claimed && <span className="p-place-claimed">이미 다른 사장님이 등록한 매장이에요</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error && <p className="p-error" role="alert">{error}</p>}

          {picked && (
            <button
              type="button"
              className="p-btn p-btn--primary p-btn--block"
              disabled={busy}
              onClick={() => void submit({ petCafeId: picked.petCafeId })}
            >
              {busy ? "등록 중…" : `'${picked.name}'(으)로 등록하기`}
            </button>
          )}

          <button type="button" className="p-link p-link--center" onClick={startManual}>
            목록에 없어요 · 직접 입력할게요
          </button>
          {search.kind === "done" && search.items.some((p) => p.claimed) && (
            <p className="p-fine">
              우리 매장인데 이미 등록돼 있다면 <a href="mailto:pawstamp@rubi-on.com">pawstamp@rubi-on.com</a> 으로 알려 주세요.
            </p>
          )}
        </section>
      )}

      {manual && (
        <form className="p-card" onSubmit={submitManual} noValidate>
          <label className="p-field">
            <span className="p-label">매장 이름</span>
            <input className="p-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </label>
          <label className="p-field">
            <span className="p-label">주소</span>
            <input
              className="p-input"
              placeholder="도로명 주소"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label className="p-field">
            <span className="p-label">업종</span>
            <select className="p-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="p-field">
            <span className="p-label">
              전화번호 <span className="p-optional">(선택)</span>
            </span>
            <input
              className="p-input"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          {error && <p className="p-error" role="alert">{error}</p>}
          <button type="submit" className="p-btn p-btn--primary p-btn--block" disabled={busy}>
            {busy ? "등록 중…" : "매장 등록하기"}
          </button>
          <button
            type="button"
            className="p-link p-link--center"
            onClick={() => {
              setManual(false);
              setError(null);
            }}
          >
            나들이 장소에서 다시 찾기
          </button>
        </form>
      )}
    </div>
  );
}

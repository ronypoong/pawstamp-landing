import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  PartnerApiError,
  createVenue,
  searchPlaces,
  submitClaimDispute,
  PLACE_TYPES,
  type CreateVenueInput,
  type PlaceTypeCode,
  type PlaceSearchItem,
} from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";
import { PlaceFinder } from "./PlaceFinder";
import { MapPinField, isInKorea, type LatLng } from "./MapPinField";


type SearchState = { kind: "idle" } | { kind: "loading" } | { kind: "done"; items: PlaceSearchItem[] } | { kind: "error" };

/** 매장 등록: 기존 나들이 장소에서 찾아 연결하거나, 없으면 직접 입력. */
export function PartnerVenueNewPage() {
  const navigate = useNavigate();
  const { venues, reloadVenues, selectVenue, handleAuthError } = usePartner();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [picked, setPicked] = useState<PlaceSearchItem | null>(null);
  /** pick: 나들이 장소 검색 / naver: 네이버·주소로 위치 찾기 / manual: 위치 없이 직접 입력 */
  const [mode, setMode] = useState<"pick" | "naver" | "manual">("pick");
  const manual = mode !== "pick";
  const [form, setForm] = useState<{ name: string; address: string; category: PlaceTypeCode; phone: string }>({
    name: "",
    address: "",
    category: "cafe",
    phone: "",
  });
  /** 직접 입력 경로의 지도 핀(선택). 찍으면 좌표 포함 naverPlace 로 등록 → 앱 지도에 표시 */
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState<LatLng | null>(null);
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
      navigate("/partner/verify?new=1", { replace: true });
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
    if (pinOpen && pin) {
      if (!isInKorea(pin) && !window.confirm("찍은 위치가 한국 밖이에요. 이대로 등록할까요?")) return;
      void submit({
        naverPlace: {
          name: form.name.trim(),
          address: form.address.trim(),
          roadAddress: form.address.trim(),
          latitude: pin.lat,
          longitude: pin.lng,
          category: form.category,
          telephone: form.phone.trim() || null,
          link: null,
          existingPetCafeId: null,
          claimed: false,
        },
      });
      return;
    }
    // 위치 없이 등록(기존 방식): 업종은 라벨 문자열로
    void submit({
      name: form.name.trim(),
      address: form.address.trim(),
      category: PLACE_TYPES.find((t) => t.code === form.category)?.label ?? form.category,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    });
  }

  function startManual() {
    setMode("manual");
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
          {mode === "naver"
            ? "네이버 지도에서 우리 매장을 골라 주세요. 앱 지도에 그 위치로 표시돼요."
            : mode === "manual"
              ? "매장 정보를 직접 적어 주세요."
              : "발도장 나들이 장소에 이미 있는 매장이면 연결해 주세요. 앱에서 우리 매장을 본 횟수까지 함께 보여드려요."}
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
                    {p.claimed && <ClaimDispute place={p} />}
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

          <button
            type="button"
            className="p-link p-link--center"
            onClick={() => {
              setMode("naver");
              setPicked(null);
              setError(null);
            }}
          >
            목록에 없어요 · 네이버 지도에서 찾기
          </button>
        </section>
      )}

      {mode === "naver" && (
        <section className="p-card">
          <PlaceFinder
            onBack={() => {
              setMode("pick");
              setError(null);
            }}
            backLabel="나들이 장소 검색으로"
            initialQuery={query}
            submitLabel="이 위치로 등록하기"
            busy={busy}
            // 기존 나들이 장소와 같은 곳(이름·50m)이면 BE 가 그 장소에 연결한다.
            onPick={(p) => void submit({ naverPlace: p })}
            onManual={startManual}
          />
          {error && <p className="p-error" role="alert">{error}</p>}
        </section>
      )}

      {mode === "manual" && (
        <form className="p-card" onSubmit={submitManual} noValidate>
          <button
            type="button"
            className="p-link pfd-back"
            onClick={() => {
              setMode("naver");
              setError(null);
            }}
          >
            ← 지도 위치 찾기로 돌아가기
          </button>
          {pinOpen ? (
            <div className="p-banner pfd-warn" role="status">
              <div>
                <b>지도에서 찍은 위치로 앱 지도에 표시돼요.</b>
              </div>
            </div>
          ) : (
            <div className="p-banner p-banner--warn pfd-warn" role="status">
              <div>
                <b>앱 지도에는 아직 안 보여요.</b> 아래에서 지도에 위치를 찍거나, 등록 후 '내 정보'에서 연결할 수 있어요.
              </div>
            </div>
          )}
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
            <span className="p-hint pfd-field-hint">주소를 적어 두면 나중에 위치 연결이 쉬워요.</span>
          </label>
          <label className="p-field">
            <span className="p-label">업종</span>
            <select className="p-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PlaceTypeCode })}>
              {PLACE_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="p-field">
            <span className="p-label">
              지도 위치 <span className="p-optional">(선택)</span>
            </span>
            {pinOpen ? (
              <>
                <MapPinField initial={null} value={pin} onChange={setPin} />
                <button
                  type="button"
                  className="p-link"
                  onClick={() => {
                    setPinOpen(false);
                    setPin(null);
                  }}
                >
                  지도 위치 빼고 등록하기
                </button>
              </>
            ) : (
              <button type="button" className="p-btn p-btn--ghost p-btn--block" onClick={() => setPinOpen(true)}>
                지도에서 위치 찍기
              </button>
            )}
          </div>
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
        </form>
      )}
    </div>
  );
}

/** 이미 다른 파트너가 연결한 장소: "내 매장인데 이미 등록돼 있어요" → 운영팀 확인 요청. */
function ClaimDispute({ place }: { place: PlaceSearchItem }) {
  const { handleAuthError } = usePartner();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return <p className="p-success cd-done">접수했어요. 운영팀이 확인한 뒤 로그인 이메일로 연락드릴게요.</p>;
  }
  if (!open) {
    return (
      <button type="button" className="p-link cd-open" onClick={() => setOpen(true)}>
        내 매장인데 이미 등록돼 있어요
      </button>
    );
  }
  async function send() {
    if (message.trim().length < 10) {
      setError("상황을 10자 이상 적어 주세요.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      await submitClaimDispute(place.petCafeId, message.trim());
      setState("sent");
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e instanceof PartnerApiError ? e.message : "보내지 못했어요. 잠시 후 다시 시도해 주세요.");
      setState("idle");
    }
  }
  return (
    <div className="cd-box">
      <label className="p-field">
        <span className="p-label">운영팀에 알려 주세요</span>
        <textarea
          className="p-input pf-textarea cd-textarea"
          rows={3}
          maxLength={500}
          placeholder="예) 제가 운영하는 매장인데 등록한 적이 없어요. 사업자등록증으로 확인 가능해요."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {error && <p className="p-error">{error}</p>}
      <div className="cd-actions">
        <button type="button" className="p-btn p-btn--text p-btn--sm" onClick={() => setOpen(false)}>
          취소
        </button>
        <button type="button" className="p-btn p-btn--primary p-btn--sm" disabled={state === "sending"} onClick={() => void send()}>
          {state === "sending" ? "보내는 중…" : "확인 요청 보내기"}
        </button>
      </div>
    </div>
  );
}

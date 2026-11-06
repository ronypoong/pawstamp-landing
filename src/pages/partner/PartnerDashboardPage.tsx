import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCheckins,
  fetchVenueProfile,
  fetchVenueStats,
  kstDate,
  type Checkin,
  type CheckinVaccineStatus,
  type VenueStats,
} from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

const POLL_MS = 30_000;

const BADGE: Record<CheckinVaccineStatus, string> = {
  valid: "접종 유효",
  expiring: "곧 만료",
  expired: "만료 있음",
  missing: "미등록 있음",
};

const ITEM_BADGE: Record<CheckinVaccineStatus, string> = {
  valid: "유효",
  expiring: "임박",
  expired: "만료",
  missing: "미등록",
};

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

function kstTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

/** "오후 2:14" — 업데이트 시각 표시용(01:00 이 새벽으로 읽히는 혼동 방지). */
function kstClock(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}

function kstShortDate(iso: string): string {
  const key = new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  if (key === kstDate()) return "오늘";
  if (key === kstDate(-1)) return "어제";
  const [, m, d] = key.split("-").map(Number);
  return `${m}/${d}`;
}

function fmtDate(d: string | null): string {
  return d ? d.slice(0, 10).replace(/-/g, ".") : "기록 없음";
}

function nf(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function PartnerDashboardPage() {
  const { venue } = usePartner();

  useEffect(() => {
    document.title = "방문 현황 — 발도장 파트너";
  }, []);

  if (!venue) return null;
  return (
    <div className="p-dash">
      {!venue.active && (
        <p className="p-banner p-banner--warn">
          이 매장은 체크인 받기가 꺼져 있어요. <Link to="/partner/me">내 정보</Link>에서 다시 켤 수 있어요.
        </p>
      )}
      <ProfileNudge venueId={venue.id} />
      <TodayCheckins venueId={venue.id} />
      <StatsSection venueId={venue.id} linked={venue.petCafeId != null} />
      <p className="p-legal">
        접종 상태는 손님이 발도장 앱에 기록한 정보를 체크인 시점에 보여주는 것으로, 공식 증명서를 대신하지 않아요. 확인을 돕는
        도구로 써 주세요.
      </p>
    </div>
  );
}

// ─── 매장 꾸미기 넛지: 사진·한 줄 소개가 모두 비었을 때만 ─────
function ProfileNudge({ venueId }: { venueId: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    setShow(false);
    fetchVenueProfile(venueId)
      .then((p) => {
        if (!alive) return;
        const empty = p.photos.length === 0 && !p.tagline?.trim() && !p.description?.trim();
        setShow(empty);
      })
      .catch(() => {
        // 넛지는 부가 정보 — 실패해도 조용히 숨긴다(인증 만료는 다른 요청이 처리).
      });
    return () => {
      alive = false;
    };
  }, [venueId]);

  if (!show) return null;
  return (
    <section className="p-card p-nudge">
      <div className="p-nudge-text">
        <p className="p-nudge-title">매장을 꾸미면 발도장 앱에 사진과 함께 소개돼요</p>
        <p className="p-nudge-body">대표 사진과 한 줄 소개만 넣어도 나들이 목록에서 훨씬 눈에 띄어요.</p>
      </div>
      <Link className="p-btn p-btn--primary p-btn--sm" to="/partner/profile">
        매장 꾸미기
      </Link>
    </section>
  );
}

// ─── 오늘 체크인 (30초 폴링) ──────────────────
type TodayState = { kind: "loading" } | { kind: "ok"; list: Checkin[]; at: Date } | { kind: "error"; list: Checkin[] | null };

function TodayCheckins({ venueId }: { venueId: number }) {
  const { handleAuthError } = usePartner();
  const [state, setState] = useState<TodayState>({ kind: "loading" });
  const [openId, setOpenId] = useState<number | null>(null);
  const [onlyAlert, setOnlyAlert] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchCheckins(venueId);
      list.sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));
      setState({ kind: "ok", list, at: new Date() });
    } catch (e) {
      if (handleAuthError(e)) return;
      setState((s) => ({ kind: "error", list: s.kind === "ok" ? s.list : s.kind === "error" ? s.list : null }));
    }
  }, [venueId, handleAuthError]);

  useEffect(() => {
    setState({ kind: "loading" });
    setOpenId(null);
    setOnlyAlert(false);
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const list = state.kind === "ok" ? state.list : state.kind === "error" ? state.list : null;
  // "확인 필요" = 만료·미등록(임박은 아직 유효라 제외).
  const isAlert = (c: Checkin) => c.vaccineStatus === "expired" || c.vaccineStatus === "missing";
  const attention = list?.filter(isAlert).length ?? 0;
  const shown = list && onlyAlert ? list.filter(isAlert) : list;

  return (
    <section className="p-card p-today" aria-labelledby="today-title">
      <div className="p-section-head">
        <div>
          <h2 id="today-title" className="p-card-title">
            오늘 체크인 {list && <span className="p-count">{list.length}</span>}
          </h2>
          {list && list.length > 0 && attention === 0 && <p className="p-section-sub">만료·미등록 접종이 있는 반려견은 없어요</p>}
        </div>
        <span className="p-live" aria-live="polite">
          {state.kind === "error" ? (
            <span className="p-live-error">연결 끊김 · 다시 시도 중</span>
          ) : (
            <>
              <span className="p-live-dot" aria-hidden />
              {state.kind === "ok" ? `${kstClock(state.at)} 기준` : "불러오는 중"}
            </>
          )}
        </span>
      </div>

      {state.kind === "loading" && (
        <div aria-busy="true">
          <div className="pass-skeleton p-skeleton-row" />
          <div className="pass-skeleton p-skeleton-row" />
        </div>
      )}

      {list && list.length === 0 && (
        <div className="p-empty">
          <p className="p-empty-title">아직 오늘 체크인한 반려견이 없어요</p>
          <p className="p-empty-body">
            손님이 입구의 QR을 찍으면 여기에 바로 나타나요. 포스터가 눈에 잘 띄는 곳에 붙어 있는지 확인해 보세요.
          </p>
          <Link className="p-btn p-btn--ghost p-btn--sm" to="/partner/poster">
            QR 포스터 보기
          </Link>
        </div>
      )}

      {state.kind === "error" && !list && <p className="p-error">목록을 불러오지 못했어요. 30초 뒤 다시 시도할게요.</p>}

      {list && list.length > 0 && attention > 0 && (
        <div className="p-segment p-segment--sm p-today-filter" role="radiogroup" aria-label="목록 필터">
          <button type="button" role="radio" aria-checked={!onlyAlert} className={!onlyAlert ? "active" : undefined} onClick={() => setOnlyAlert(false)}>
            전체 {list.length}
          </button>
          <button type="button" role="radio" aria-checked={onlyAlert} className={onlyAlert ? "active" : undefined} onClick={() => setOnlyAlert(true)}>
            확인 필요 {attention}
          </button>
        </div>
      )}

      {shown && shown.length > 0 && (
        <ul className="p-checkins">
          {shown.map((c) => {
            const open = openId === c.id;
            return (
              <li key={c.id} className={`p-checkin${open ? " is-open" : ""}${isAlert(c) ? " p-checkin--alert" : ""}`}>
                <button
                  type="button"
                  className="p-checkin-row"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : c.id)}
                >
                  <PetThumb name={c.pet.name} url={c.pet.photoThumbnailUrl} />
                  <span className="p-checkin-main">
                    <span className="p-checkin-name">
                      {c.pet.name}
                      {c.pet.breed && <span className="p-checkin-breed">{c.pet.breed}</span>}
                    </span>
                    <span className="p-checkin-meta">
                      {kstTime(c.checkedInAt)} · {c.visitCount <= 1 ? <b className="p-first">첫 방문</b> : `${c.visitCount}번째 방문`}
                    </span>
                  </span>
                  <span className={`pass-badge pass-badge--${c.vaccineStatus}`}>{BADGE[c.vaccineStatus]}</span>
                  <Chevron open={open} />
                </button>
                {open && (
                  <ul className="p-checkin-items">
                    {c.items.length === 0 && <li className="p-checkin-item">등록된 필수 접종 기록이 없어요</li>}
                    {c.items.map((i) => (
                      <li key={i.code} className="p-checkin-item">
                        <span>{i.name}</span>
                        <span className="p-checkin-item-right">
                          <span className="p-checkin-exp">{i.expiresAt ? `${fmtDate(i.expiresAt)} 까지` : "기록 없음"}</span>
                          <span className={`pass-badge pass-badge--${i.status}`}>{ITEM_BADGE[i.status]}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PetThumb({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <span className="p-thumb p-thumb--initial" aria-hidden>
        {name.trim().charAt(0) || "?"}
      </span>
    );
  }
  return <img className="p-thumb" src={url} alt="" onError={() => setFailed(true)} />;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className="p-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: open ? "rotate(180deg)" : undefined }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ─── 통계 ────────────────────────────────────
type StatsState = { kind: "loading" } | { kind: "ok"; stats: VenueStats } | { kind: "error" };

function StatsSection({ venueId, linked }: { venueId: number; linked: boolean }) {
  const { handleAuthError } = usePartner();
  const [period, setPeriod] = useState<Period>(30);
  const [state, setState] = useState<StatsState>({ kind: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    fetchVenueStats(venueId, kstDate(-(period - 1)), kstDate())
      .then((stats) => alive && setState({ kind: "ok", stats }))
      .catch((e) => {
        if (!alive || handleAuthError(e)) return;
        setState({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [venueId, period, reload, handleAuthError]);

  return (
    <section className="p-stats" aria-labelledby="stats-title">
      <div className="p-section-head p-section-head--stats">
        <h2 id="stats-title" className="p-card-title">
          방문 통계
        </h2>
        <div className="p-segment p-segment--sm" role="radiogroup" aria-label="기간">
          {PERIODS.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} className={period === p ? "active" : undefined} onClick={() => setPeriod(p)}>
              {p}일
            </button>
          ))}
        </div>
      </div>

      {state.kind === "loading" && (
        <div className="p-kpis" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pass-skeleton p-skeleton-kpi" />
          ))}
        </div>
      )}
      {state.kind === "error" && (
        <div className="p-card p-empty">
          <p className="p-empty-title">통계를 불러오지 못했어요</p>
          <button type="button" className="p-btn p-btn--ghost p-btn--sm" onClick={() => setReload((r) => r + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {state.kind === "ok" && <StatsBody s={state.stats} period={period} linked={linked} />}
    </section>
  );
}

function StatsBody({ s, period, linked }: { s: VenueStats; period: Period; linked: boolean }) {
  if (s.visits === 0) {
    return (
      <>
        <div className="p-card p-empty">
          <p className="p-empty-title">최근 {period}일 동안 체크인 기록이 없어요</p>
          <p className="p-empty-body">첫 체크인이 쌓이면 요일·시간대별 방문과 단골 반려견을 여기서 보여드릴게요.</p>
        </div>
        <AppExposure s={s} linked={linked} period={period} />
      </>
    );
  }

  const weekday = WEEKDAYS.map((label, i) => ({ label, value: s.byWeekday.find((w) => w.weekday === i + 1)?.count ?? 0 }));
  const hours = trimHours(s.byHour);

  return (
    <>
      <div className="p-kpis">
        <Kpi label="방문" value={`${nf(s.visits)}회`} />
        <Kpi label="방문한 반려견" value={`${nf(s.uniquePets)}마리`} />
        <Kpi label="새로 온 반려견" value={`${nf(s.newPets)}마리`} hint={`다시 온 반려견 ${nf(s.returningPets)}마리`} />
        <Kpi label="재방문율" value={`${Math.round(s.revisitRate30d * 100)}%`} hint="30일 안에 2번 이상 온 반려견 비율" />
      </div>

      <div className="p-grid-2">
        <div className="p-card">
          <h3 className="p-chart-title">요일별 방문</h3>
          <BarChart data={weekday} unit="회" />
        </div>
        <div className="p-card">
          <h3 className="p-chart-title">시간대별 방문</h3>
          {hours.length > 0 ? <BarChart data={hours} unit="회" labelEvery={hours.length > 12 ? 3 : 2} /> : <p className="p-hint">데이터가 아직 적어요</p>}
        </div>
      </div>

      <div className="p-grid-2">
        <div className="p-card">
          <h3 className="p-chart-title">단골 반려견 TOP</h3>
          {s.topRegulars.length === 0 ? (
            <p className="p-hint">두 번 이상 방문한 반려견이 생기면 보여드려요.</p>
          ) : (
            <ol className="p-regulars">
              {s.topRegulars.slice(0, 5).map((r, i) => (
                <li key={`${r.petName}-${i}`}>
                  <span className="p-rank">{i + 1}</span>
                  <span className="p-regular-name">
                    {r.petName}
                    {r.breed && <span className="p-checkin-breed">{r.breed}</span>}
                  </span>
                  <span className="p-regular-meta">
                    <b>{r.visitCount}회</b> · {kstShortDate(r.lastVisitAt)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="p-card">
          <h3 className="p-chart-title">체크인 때 접종 상태</h3>
          <VaccineMix mix={s.vaccineMix} />
        </div>
      </div>

      <AppExposure s={s} linked={linked} period={period} />
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-kpi">
      <span className="p-kpi-label">{label}</span>
      <span className="p-kpi-value">{value}</span>
      {hint && <span className="p-kpi-hint">{hint}</span>}
    </div>
  );
}

function AppExposure({ s, linked, period }: { s: VenueStats; linked: boolean; period: Period }) {
  return (
    <div className="p-card p-exposure">
      <h3 className="p-chart-title">발도장 앱에서 우리 매장</h3>
      {linked ? (
        <p className="p-exposure-text">
          최근 {period}일 동안 <b>{nf(s.appViews)}번</b> 조회되고, <b>{nf(s.appNavigations)}번</b> 길찾기를 눌렀어요.
        </p>
      ) : (
        <p className="p-hint">나들이 장소와 연결하면 앱에서 우리 매장이 조회된 횟수와 길찾기 횟수를 보여드려요.</p>
      )}
    </div>
  );
}

/** 0~23시 중 방문이 있는 구간만(앞뒤 1시간 여유) 잘라 보여준다. */
function trimHours(byHour: VenueStats["byHour"]): { label: string; value: number }[] {
  const counts = Array.from({ length: 24 }, (_, h) => byHour.find((b) => b.hour === h)?.count ?? 0);
  const first = counts.findIndex((c) => c > 0);
  if (first < 0) return [];
  const last = 23 - [...counts].reverse().findIndex((c) => c > 0);
  const from = Math.max(0, first - 1);
  const to = Math.min(23, last + 1);
  return counts.slice(from, to + 1).map((value, i) => ({ label: `${from + i}시`, value }));
}

/** 가벼운 SVG 막대 차트(단일 계열). 가장 큰 막대만 값 라벨, 나머지는 hover/포커스 title. */
function BarChart({ data, unit, labelEvery = 1 }: { data: { label: string; value: number }[]; unit: string; labelEvery?: number }) {
  const W = 320;
  const H = 140;
  const top = 18;
  const bottom = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = W / data.length;
  const bw = Math.max(4, Math.min(28, slot * 0.62));
  const peak = data.findIndex((d) => d.value === max);
  const ph = H - top - bottom;

  return (
    <figure className="p-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}>
        <line x1="0" x2={W} y1={H - bottom + 0.5} y2={H - bottom + 0.5} className="p-chart-axis" />
        {data.map((d, i) => {
          const h = d.value === 0 ? 0 : Math.max(3, (d.value / max) * ph);
          const x = i * slot + (slot - bw) / 2;
          const y = H - bottom - h;
          const r = Math.min(4, h, bw / 2);
          return (
            <g key={d.label}>
              <title>{`${d.label} ${d.value}${unit}`}</title>
              <rect x={i * slot} y={top} width={slot} height={ph} fill="transparent" />
              {h > 0 && (
                <path
                  className={i === peak ? "p-bar p-bar--peak" : "p-bar"}
                  d={`M${x} ${H - bottom}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${H - bottom}Z`}
                />
              )}
              {i === peak && (
                <text x={x + bw / 2} y={y - 5} textAnchor="middle" className="p-chart-value">
                  {d.value}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text x={i * slot + slot / 2} y={H - 6} textAnchor="middle" className="p-chart-label">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function VaccineMix({ mix }: { mix: VenueStats["vaccineMix"] }) {
  const rows: { key: CheckinVaccineStatus; label: string; value: number }[] = [
    { key: "valid", label: "유효", value: mix.valid },
    { key: "expiring", label: "곧 만료", value: mix.expiring },
    { key: "expired", label: "만료 있음", value: mix.expired },
    { key: "missing", label: "미등록 있음", value: mix.missing },
  ];
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (total === 0) return <p className="p-hint">아직 기록이 없어요.</p>;
  return (
    <>
      <div className="p-mix-bar" role="img" aria-label={rows.map((r) => `${r.label} ${r.value}회`).join(", ")}>
        {rows
          .filter((r) => r.value > 0)
          .map((r) => (
            <span key={r.key} className={`p-mix-seg p-mix-seg--${r.key}`} style={{ flexGrow: r.value }} />
          ))}
      </div>
      <ul className="p-mix-legend">
        {rows.map((r) => (
          <li key={r.key}>
            <span className={`p-mix-dot p-mix-seg--${r.key}`} aria-hidden />
            <span>{r.label}</span>
            <b>
              {Math.round((r.value / total) * 100)}% <span className="p-mix-n">· {nf(r.value)}회</span>
            </b>
          </li>
        ))}
      </ul>
    </>
  );
}

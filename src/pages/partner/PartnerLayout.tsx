import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandPaw } from "../../components/BrandPaw";
import {
  PartnerAuthError,
  fetchPartnerMe,
  fetchVenues,
  getPartnerToken,
  setPartnerToken,
  verificationStep,
  type PartnerProfile,
  type Venue,
} from "../../lib/partnerApi";

const SELECTED_KEY = "pawstamp.partner.venue";

interface PartnerContextValue {
  me: PartnerProfile;
  setMe: (me: PartnerProfile) => void;
  venues: Venue[];
  venue: Venue | null;
  selectVenue: (id: number) => void;
  reloadVenues: () => Promise<Venue[]>;
  logout: () => void;
  /** API 에러 공통 처리: 인증 만료면 로그인으로 보낸다. 처리했으면 true. */
  handleAuthError: (e: unknown) => boolean;
  /** 저장 안 한 변경이 있는 화면이 등록. 탭·매장 이동 전에 확인창을 띄운다. */
  setDirty: (dirty: boolean) => void;
  /** 이동해도 되면 true(변경 없음 또는 사용자가 확인). */
  confirmLeave: () => boolean;
}

const LEAVE_MESSAGE = "저장하지 않은 내용이 있어요. 이동하면 사라져요. 이동할까요?";

const PartnerContext = createContext<PartnerContextValue | null>(null);

export function usePartner(): PartnerContextValue {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error("usePartner must be used inside PartnerLayout");
  return ctx;
}

function readSelected(): number | null {
  try {
    const v = window.localStorage.getItem(SELECTED_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeSelected(id: number) {
  try {
    window.localStorage.setItem(SELECTED_KEY, String(id));
  } catch {
    // 무시
  }
}

/** 로그인/비로그인 공통 껍데기: 얇은 헤더(인장 + 발도장 파트너) + 본문. 인쇄 시 헤더는 숨는다. */
export function PartnerShell({ children, right, onBrandClick }: { children: ReactNode; right?: ReactNode; onBrandClick?: (e: MouseEvent) => void }) {
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <div className="p-app">
      <header className="p-header">
        <div className="p-header-row">
          <Link className="p-brand" to="/partner" aria-label="발도장 파트너 소개" onClick={onBrandClick}>
            <BrandPaw size={26} />
            <span>발도장</span>
            <span className="p-brand-tag">파트너</span>
          </Link>
          {right}
        </div>
      </header>
      {children}
    </div>
  );
}

type LoadState = { kind: "loading" } | { kind: "ready"; me: PartnerProfile; venues: Venue[] } | { kind: "error" };

/** 로그인 필요한 파트너 화면(/partner/dashboard 등) 레이아웃. 매장 선택·탭 내비게이션 제공. */
export function PartnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<number | null>(readSelected);
  const dirtyRef = useRef(false);

  // 새로고침·창 닫기 이탈 경고
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const goLogin = useCallback(() => {
    const next = location.pathname + location.search;
    navigate(`/partner/login?next=${encodeURIComponent(next)}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const handleAuthError = useCallback(
    (e: unknown) => {
      if (e instanceof PartnerAuthError) {
        goLogin();
        return true;
      }
      return false;
    },
    [goLogin],
  );

  const load = useCallback(async () => {
    if (!getPartnerToken() && !import.meta.env.DEV) {
      goLogin();
      return;
    }
    setState({ kind: "loading" });
    try {
      const [me, venues] = await Promise.all([fetchPartnerMe(), fetchVenues()]);
      setState({ kind: "ready", me, venues });
    } catch (e) {
      if (!handleAuthError(e)) setState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = state.kind === "ready" ? state : null;

  // 매장이 하나도 없으면 매장 등록부터.
  useEffect(() => {
    if (!ready) return;
    const free = ["/partner/venues/new", "/partner/me"];
    if (ready.venues.length === 0 && !free.includes(location.pathname)) {
      navigate("/partner/venues/new", { replace: true });
    }
  }, [ready, location.pathname, navigate]);

  const value = useMemo<PartnerContextValue | null>(() => {
    if (!ready) return null;
    const venue = ready.venues.find((v) => v.id === selectedId) ?? ready.venues[0] ?? null;
    return {
      me: ready.me,
      setMe: (me) => setState({ ...ready, me }),
      venues: ready.venues,
      venue,
      selectVenue: (id) => {
        setSelectedId(id);
        writeSelected(id);
      },
      reloadVenues: async () => {
        const venues = await fetchVenues();
        setState((s) => (s.kind === "ready" ? { ...s, venues } : s));
        return venues;
      },
      logout: () => {
        setPartnerToken(null);
        navigate("/partner", { replace: true });
      },
      handleAuthError,
      setDirty: (d) => {
        dirtyRef.current = d;
      },
      confirmLeave: () => {
        if (!dirtyRef.current) return true;
        if (!window.confirm(LEAVE_MESSAGE)) return false;
        dirtyRef.current = false;
        return true;
      },
    };
  }, [ready, selectedId, navigate, handleAuthError]);

  if (!value) {
    return (
      <PartnerShell>
        <main className="p-main">
          {state.kind === "error" ? (
            <div className="p-empty">
              <p className="p-empty-title">정보를 불러오지 못했어요</p>
              <p className="p-empty-body">인터넷 연결을 확인하고 다시 시도해 주세요.</p>
              <button type="button" className="p-btn p-btn--ghost" onClick={() => void load()}>
                다시 시도
              </button>
            </div>
          ) : (
            <div className="p-skeleton-stack" aria-busy="true" aria-label="불러오는 중">
              <div className="pass-skeleton p-skeleton-lg" />
              <div className="pass-skeleton p-skeleton-md" />
              <div className="pass-skeleton p-skeleton-md" />
            </div>
          )}
        </main>
      </PartnerShell>
    );
  }

  const hasVenue = value.venues.length > 0;
  const guard = (e: MouseEvent) => {
    if (!value.confirmLeave()) e.preventDefault();
  };
  const tabs = [
    { to: "/partner/dashboard", label: "방문 현황" },
    { to: "/partner/profile", label: "매장 꾸미기" },
    { to: "/partner/poster", label: "QR 포스터" },
    { to: "/partner/me", label: "내 정보" },
  ];

  return (
    <PartnerContext.Provider value={value}>
      <PartnerShell right={hasVenue ? <VenueSwitcher /> : undefined} onBrandClick={guard}>
        {hasVenue && (
          <nav className="p-tabs" aria-label="파트너 메뉴">
            <div className="p-tabs-row">
              {tabs.map((t) => (
                <NavLink key={t.to} to={t.to} onClick={guard} className={({ isActive }) => `p-tab${isActive ? " active" : ""}`}>
                  {t.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
        <main className="p-main">
          {hasVenue && !["/partner/verify", "/partner/venues/new", "/partner/me", "/partner/location"].includes(location.pathname) && <VerificationBanner />}
          <Outlet />
        </main>
      </PartnerShell>
    </PartnerContext.Provider>
  );
}

/** 인증 전·반려 매장 상단 안내. 인증 매장은 표시 없음(헤더의 '인증 매장' 칩으로 충분). */
function VerificationBanner() {
  const { venue } = usePartner();
  if (!venue) return null;
  const step = verificationStep(venue);
  if (step === "verified") return null;
  // 위치도 없으면 '공개까지 남은 단계' 카드 하나로 합친다(primary CTA 는 다음 할 일 하나).
  if (venue.hasLocation === false) return <PublishStepsBanner step={step} />;
  if (step === "rejected") {
    return (
      <div className="p-banner vf-banner" role="status">
        <div>
          <span className="vf-badge vf-badge--danger">다시 확인 필요</span>{" "}
          <b>사업자 인증에서 한 가지만 고쳐 주세요.</b>
          {venue.verificationRejectReason && <div className="vf-banner-reason">{venue.verificationRejectReason}</div>}
        </div>
        <Link className="p-btn p-btn--primary" to="/partner/verify">
          다시 확인
        </Link>
      </div>
    );
  }
  return (
    <div className="p-banner vf-banner" role="status">
      <div>
        <b>{step === "pending" ? "상호가 매장명과 달라 운영팀이 확인하고 있어요(보통 1영업일)." : "사업자 인증을 마쳐 주세요."}</b>{" "}
        인증이 끝나면 발도장 앱에 공개되고 체크인을 받을 수 있어요.
        {step === "pending" && (
          <>
            {" "}
            그동안 <Link to="/partner/profile">매장 꾸미기</Link>를 해 두세요.
          </>
        )}
      </div>
      {step === "unsubmitted" && (
        <Link className="p-btn p-btn--primary" to="/partner/verify">
          인증하기
        </Link>
      )}
    </div>
  );
}

function PublishStepsBanner({ step }: { step: Exclude<ReturnType<typeof verificationStep>, "verified"> }) {
  return (
    <div className="p-banner vf-banner pub-steps" role="status">
      <div>
        <b>앱에 공개하려면 2가지만 하면 돼요.</b>
        <ol className="pub-list">
          <li>
            <span className="pub-no">1</span>지도 위치 연결
          </li>
          <li>
            <span className="pub-no">2</span>사업자 인증
            {step === "pending" && <span className="vf-badge">확인 중(보통 1영업일)</span>}
            {step === "rejected" && <span className="vf-badge vf-badge--danger">다시 확인 필요</span>}
          </li>
        </ol>
      </div>
      <div className="pub-actions">
        <Link className="p-btn p-btn--primary" to="/partner/location">
          지도 위치 연결하기
        </Link>
        {step !== "pending" && (
          <Link className="p-link" to="/partner/verify">
            인증 먼저 하기
          </Link>
        )}
      </div>
    </div>
  );
}

function VenueSwitcher() {
  const { venues, venue, selectVenue, confirmLeave } = usePartner();
  const navigate = useNavigate();
  if (!venue) return null;
  const verified = verificationStep(venue) === "verified";
  return (
    <div className="p-venue-switch-wrap">
    {verified && <span className="vf-badge vf-badge--ok vf-badge--header">인증 매장</span>}
    <label className="p-venue-switch">
      <span className="sr-only">매장 선택</span>
      <select
        value={venue.id}
        onChange={(e) => {
          if (!confirmLeave()) return;
          if (e.target.value === "new") navigate("/partner/venues/new");
          else selectVenue(Number(e.target.value));
        }}
      >
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
            {v.active ? "" : " (중지됨)"}
          </option>
        ))}
        <option value="new">+ 매장 추가</option>
      </select>
    </label>
    </div>
  );
}

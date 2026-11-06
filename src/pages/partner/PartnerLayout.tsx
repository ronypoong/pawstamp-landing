import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandPaw } from "../../components/BrandPaw";
import {
  PartnerAuthError,
  fetchPartnerMe,
  fetchVenues,
  getPartnerToken,
  setPartnerToken,
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
}

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
export function PartnerShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
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
          <Link className="p-brand" to="/partner" aria-label="발도장 파트너 소개">
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

  return (
    <PartnerContext.Provider value={value}>
      <PartnerShell right={hasVenue ? <VenueSwitcher /> : undefined}>
        {hasVenue && (
          <nav className="p-tabs" aria-label="파트너 메뉴">
            <div className="p-tabs-row">
              <NavLink to="/partner/dashboard" className={({ isActive }) => `p-tab${isActive ? " active" : ""}`}>
                방문 현황
              </NavLink>
              <NavLink to="/partner/poster" className={({ isActive }) => `p-tab${isActive ? " active" : ""}`}>
                QR 포스터
              </NavLink>
              <NavLink to="/partner/me" className={({ isActive }) => `p-tab${isActive ? " active" : ""}`}>
                내 정보
              </NavLink>
            </div>
          </nav>
        )}
        <main className="p-main">
          <Outlet />
        </main>
      </PartnerShell>
    </PartnerContext.Provider>
  );
}

function VenueSwitcher() {
  const { venues, venue, selectVenue } = usePartner();
  const navigate = useNavigate();
  if (!venue) return null;
  return (
    <label className="p-venue-switch">
      <span className="sr-only">매장 선택</span>
      <select
        value={venue.id}
        onChange={(e) => {
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
  );
}

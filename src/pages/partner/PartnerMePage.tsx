import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  PartnerApiError,
  fetchVerificationInfo,
  updatePartnerMe,
  updateVenue,
  verificationStep,
  type Venue,
  type VerificationInfo,
} from "../../lib/partnerApi";

const STEP_LABEL = { verified: "인증 매장", pending: "확인 중", unsubmitted: "인증 전", rejected: "다시 확인 필요" } as const;
import { usePartner } from "./PartnerLayout";
import { VenueLocationCard } from "./VenueLocationCard";

/** 내 정보: 표시 이름 수정, 매장별 체크인 받기 켜고 끄기, 로그아웃. */
export function PartnerMePage() {
  const { me, setMe, venues, reloadVenues, logout, handleAuthError, selectVenue } = usePartner();
  const [name, setName] = useState(me.name ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const deletedName = (useLocation().state as { deleted?: string } | null)?.deleted ?? null;

  useEffect(() => {
    document.title = "내 정보 — 발도장 파트너";
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage({ ok: false, text: "이름을 입력해 주세요." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updatePartnerMe(trimmed);
      setMe(updated);
      setMessage({ ok: true, text: "저장했어요." });
    } catch (err) {
      if (handleAuthError(err)) return;
      setMessage({ ok: false, text: err instanceof PartnerApiError ? err.message : "저장하지 못했어요." });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(v: Venue) {
    const ok = window.confirm(
      v.active
        ? `'${v.name}'의 체크인 받기를 끌까요?\n포스터 QR을 찍어도 체크인이 되지 않아요.`
        : `'${v.name}'의 체크인 받기를 다시 켤까요?`,
    );
    if (!ok) return;
    setTogglingId(v.id);
    try {
      await updateVenue(v.id, { active: !v.active });
      await reloadVenues();
    } catch (err) {
      if (!handleAuthError(err)) window.alert(err instanceof PartnerApiError ? err.message : "변경하지 못했어요.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        <h1 className="p-title">내 정보</h1>
      </header>
      {deletedName && (
        <p className="p-banner vm-deleted" role="status">
          ‘{deletedName}’ 매장을 삭제했어요.
        </p>
      )}

      <form className="p-card" onSubmit={saveName} noValidate>
        <div className="p-field">
          <span className="p-label">로그인 이메일</span>
          <p className="p-static">{me.email}</p>
        </div>
        <label className="p-field">
          <span className="p-label">사장님 이름</span>
          <input
            className="p-input"
            value={name}
            maxLength={30}
            placeholder="예) 김멍멍"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {message && (
          <p className={message.ok ? "p-success" : "p-error"} role="status">
            {message.text}
          </p>
        )}
        <button type="submit" className="p-btn p-btn--primary" disabled={busy || name.trim() === (me.name ?? "")}>
          {busy ? "저장 중…" : "저장"}
        </button>
      </form>

      <section className="p-card">
        <h2 className="p-card-title">내 매장</h2>
        <ul className="p-venue-list">
          {venues.map((v) => (
            <li key={v.id} className="vm-card">
              <div className="vm-row">
              <div className="p-venue-info">
                <span className="p-venue-name">
                  {v.name}{" "}
                  <Link to="/partner/verify" onClick={() => selectVenue(v.id)} className={`vf-badge vf-badge--link${verificationStep(v) === "verified" ? " vf-badge--ok" : verificationStep(v) === "rejected" ? " vf-badge--danger" : ""}`}>
                    {STEP_LABEL[verificationStep(v)]}
                  </Link>
                  {v.hasLocation === false && <span className="vf-badge vf-badge--warn">지도 위치 없음</span>}
                </span>
                <span className="p-venue-meta">
                  {v.active ? "체크인 받는 중" : "체크인 꺼짐"}
                </span>
              </div>
              <button
                type="button"
                className="p-btn p-btn--ghost p-btn--sm"
                disabled={togglingId === v.id}
                onClick={() => void toggle(v)}
              >
                {v.active ? "끄기" : "켜기"}
              </button>
              </div>
              <VenueLocationCard venue={v} compact />
              <Link className="p-link vm-delete" to={`/partner/delete?venue=${v.id}`} onClick={() => selectVenue(v.id)}>
                매장 삭제
              </Link>
            </li>
          ))}
        </ul>
        <Link className="p-btn p-btn--ghost p-btn--block" to="/partner/venues/new">
          + 매장 추가
        </Link>
      </section>

      <section className="p-card">
        <h2 className="p-card-title">사업자 정보</h2>
        <p className="p-hint">인증에 쓴 정보예요. 확인에만 쓰고 앱이나 손님에게 보이지 않아요.</p>
        {venues.map((v) => (
          <BizInfo key={v.id} venue={v} showName={venues.length > 1} />
        ))}
      </section>

      <button
        type="button"
        className="p-btn p-btn--text p-btn--block"
        onClick={() => {
          if (window.confirm("로그아웃할까요?")) logout();
        }}
      >
        로그아웃
      </button>
    </div>
  );
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** 매장별 사업자 정보(마스킹) + [수정] → 인증 폼(이전 값 미리 채움). */
function BizInfo({ venue, showName }: { venue: Venue; showName: boolean }) {
  const { selectVenue, handleAuthError } = usePartner();
  const navigate = useNavigate();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ok"; info: VerificationInfo | null } | { kind: "error" }>({ kind: "loading" });
  const step = verificationStep(venue);

  useEffect(() => {
    let alive = true;
    fetchVerificationInfo(venue.id)
      .then((info) => alive && setState({ kind: "ok", info }))
      .catch((e) => {
        if (!alive || handleAuthError(e)) return;
        setState({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [venue.id, venue.verificationStatus, handleAuthError]);

  const go = (path: string) => {
    selectVenue(venue.id);
    navigate(path);
  };

  return (
    <div className="biz">
      <div className="biz-head">
        {showName && <span className="biz-venue">{venue.name}</span>}
        <span className={`vf-badge${step === "verified" ? " vf-badge--ok" : step === "rejected" ? " vf-badge--danger" : ""}`}>
          {STEP_LABEL[step]}
        </span>
      </div>
      {state.kind === "loading" && <div className="pass-skeleton biz-skeleton" aria-busy="true" />}
      {state.kind === "error" && <p className="p-hint">사업자 정보를 불러오지 못했어요.</p>}
      {state.kind === "ok" && !state.info && (
        <div className="biz-empty">
          <p className="p-hint">아직 사업자 인증 전이에요.</p>
          <button type="button" className="p-btn p-btn--primary p-btn--sm" onClick={() => go("/partner/verify")}>
            인증하기
          </button>
        </div>
      )}
      {state.kind === "ok" && state.info && (
        <>
          <dl className="biz-list">
            <div>
              <dt>사업자번호</dt>
              <dd>{state.info.bizNoMasked || "-"}</dd>
            </div>
            <div>
              <dt>대표자명</dt>
              <dd>{state.info.ownerNameMasked || "-"}</dd>
            </div>
            <div>
              <dt>개업일</dt>
              <dd>{state.info.openDate ? state.info.openDate.replace(/-/g, ".") : "-"}</dd>
            </div>
            <div>
              <dt>상호</dt>
              <dd>{state.info.businessName || "-"}</dd>
            </div>
            <div>
              <dt>마지막 확인</dt>
              <dd>{fmtDateTime(state.info.checkedAt)}</dd>
            </div>
          </dl>
          <div className="biz-actions">
            <button type="button" className="p-btn p-btn--ghost p-btn--sm" onClick={() => go("/partner/verify?edit=1")}>
              사업자 정보 수정
            </button>
            <button type="button" className="p-btn p-btn--text p-btn--sm" onClick={() => go("/partner/profile")}>
              매장 소개·연락처 수정
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PartnerApiError,
  fetchVerificationInfo,
  submitVerification,
  verificationStep,
  type Venue,
  type VerificationInfo,
  type VerificationStep,
} from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

/** 숫자만 뽑아 000-00-00000 으로. */
export function formatBizNo(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 국세청 사업자등록번호 검증식(가중치 1,3,7,1,3,7,1,3,5). */
export function isValidBizNo(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const n = digits.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += n[i] * w[i];
  sum += Math.floor((n[8] * 5) / 10);
  return (10 - (sum % 10)) % 10 === n[9];
}

/** 숫자만 뽑아 YYYY.MM.DD 로. */
export function formatDateDots(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

/** YYYYMMDD 가 실제 존재하는 날짜인지. */
function isRealDate(digits: string): boolean {
  if (!/^\d{8}$/.test(digits)) return false;
  const y = +digits.slice(0, 4), m = +digits.slice(4, 6), d = +digits.slice(6);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function todayLocal(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/**
 * 사업자 인증(/partner/verify) — 국세청 자동 진위확인.
 * 입력 → VERIFIED(즉시 완료) / PENDING(상호가 매장명과 달라 운영팀 확인) / 422(불일치, 다시 입력).
 */
export function PartnerVerifyPage() {
  const { venue } = usePartner();
  const [params, setParams] = useSearchParams();
  const [resubmit, setResubmit] = useState(false);
  /** 방금 이 화면에서 인증이 끝났으면 축하 화면 */
  const [justVerified, setJustVerified] = useState(false);
  const isNew = params.get("new") === "1";
  /** 내 정보 → [수정] 으로 들어오면 상태와 무관하게 폼(이전 값 미리 채움) */
  const editing = params.get("edit") === "1";

  useEffect(() => {
    document.title = "사업자 인증 — 발도장 파트너";
  }, []);

  if (!venue) return null;
  const step = verificationStep(venue);

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        {isNew && step !== "verified" && <p className="p-eyebrow">2단계 · 사업자 인증</p>}
        <h1 className="p-title">{venue.name}</h1>
      </header>

      {step === "verified" && !editing && (
        <section className={`p-card vf-state${justVerified ? " vf-celebrate" : ""}`} role="status">
          {justVerified ? (
            <>
              <span className="vf-stamp" aria-hidden>
                <svg width="32" height="32" viewBox="-40 -50 80 86" fill="currentColor">
                  <ellipse cx="-27" cy="-14" rx="9" ry="12" transform="rotate(-24 -27 -14)" />
                  <ellipse cx="-10" cy="-33" rx="10" ry="13" transform="rotate(-8 -10 -33)" />
                  <ellipse cx="10" cy="-33" rx="10" ry="13" transform="rotate(8 10 -33)" />
                  <ellipse cx="27" cy="-14" rx="9" ry="12" transform="rotate(24 27 -14)" />
                  <path d="M0-8C13-8 29 8 29 19C29 29 21 33 12 31C6 30 3 28 0 28C-3 28-6 30-12 31C-21 33-29 29-29 19C-29 8-13-8 0-8Z" />
                </svg>
                <span>인증</span>
              </span>
              <p className="vf-state-title">인증 완료! 이제 발도장 앱에 공개돼요</p>
              <p className="p-sub">손님 체크인도 바로 받을 수 있어요. 포스터를 출력해 입구에 붙여 주세요.</p>
            </>
          ) : (
            <>
              <span className="vf-badge vf-badge--ok">인증 매장</span>
              <p className="vf-state-title">사업자 인증이 끝났어요</p>
              <p className="p-sub">발도장 앱에 공개되고, 손님 체크인을 받을 수 있어요.</p>
            </>
          )}
          <Link className="p-btn p-btn--primary p-btn--block" to={isNew ? "/partner/poster?welcome=1" : "/partner/poster"}>
            QR 포스터 출력하기
          </Link>
          {justVerified && (
            <Link className="p-link p-link--center" to="/partner/profile">
              매장 꾸미러 가기
            </Link>
          )}
        </section>
      )}

      {step === "pending" && !resubmit && !editing && (
        <section className="p-card vf-state" role="status">
          <span className="vf-badge">확인 중</span>
          <p className="vf-state-title">운영팀이 확인하고 있어요</p>
          <p className="p-sub">
            사업자등록 상호가 매장명과 달라 운영팀이 한 번 더 확인해요. 보통 1영업일 안에 끝나고, 결과는 로그인 이메일로 알려 드려요.
          </p>
          <PendingCompare venue={venue} />
          <Link className="p-btn p-btn--primary p-btn--block" to="/partner/profile">
            그동안 매장 꾸미기
          </Link>
          <button type="button" className="p-link p-link--center" onClick={() => setResubmit(true)}>
            입력한 정보를 고쳐서 다시 확인할게요
          </button>
        </section>
      )}

      {step === "rejected" && (
        <div className="p-banner vf-rejected" role="status">
          <div>
            <span className="vf-badge vf-badge--danger">다시 확인 필요</span>
            <p className="vf-rejected-title">한 가지만 고쳐 주세요</p>
            {venue.verificationRejectReason && <p className="vf-rejected-reason">{venue.verificationRejectReason}</p>}
            <p className="vf-rejected-body">아래에서 고쳐 다시 확인해 주세요.</p>
          </div>
        </div>
      )}

      {editing && step === "verified" && (
        <p className="p-banner vf-edit-note" role="status">
          지금은 인증 매장이에요. 고친 정보로 다시 확인해도, 확인에 실패하면 기존 인증은 그대로 유지돼요.
        </p>
      )}

      {(editing || step === "unsubmitted" || step === "rejected" || (step === "pending" && resubmit)) && (
        <VerifyForm
          key={`${venue.id}-${editing}`}
          venue={venue}
          isNew={isNew}
          prefill={editing || step === "rejected" || resubmit}
          wasVerified={step === "verified"}
          onDone={(result) => {
            setResubmit(false);
            if (editing) setParams({}, { replace: true });
            if (result === "verified") setJustVerified(true);
          }}
        />
      )}
      {editing && (
        <Link className="p-link p-link--center" to="/partner/me">
          취소하고 내 정보로 돌아가기
        </Link>
      )}
    </div>
  );
}

function VerifyForm({
  venue,
  isNew,
  prefill,
  wasVerified,
  onDone,
}: {
  venue: Venue;
  isNew: boolean;
  prefill: boolean;
  wasVerified: boolean;
  onDone: (step: VerificationStep) => void;
}) {
  const { reloadVenues, handleAuthError } = usePartner();
  const [prev, setPrev] = useState<VerificationInfo | null>(null);
  const [bizNo, setBizNo] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [businessName, setBusinessName] = useState(venue.name);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  /** 422(국세청 불일치) 시 사업자번호·대표자명·개업일 칸 강조 */
  const [mismatch, setMismatch] = useState(false);

  // 이전 제출값 미리 채우기: 개업일·상호만(사업자번호·대표자명은 마스킹이라 다시 입력).
  useEffect(() => {
    if (!prefill) return;
    let alive = true;
    fetchVerificationInfo(venue.id)
      .then((info) => {
        if (!alive || !info) return;
        setPrev(info);
        if (info.openDate) setOpenDate(formatDateDots(info.openDate));
        if (info.businessName) setBusinessName(info.businessName);
      })
      .catch((e) => {
        handleAuthError(e);
      });
    return () => {
      alive = false;
    };
  }, [prefill, venue.id, handleAuthError]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const digits = bizNo.replace(/\D/g, "");
    const errs: Record<string, string> = {};
    if (!isValidBizNo(digits)) errs.bizNo = "번호가 맞지 않아요. 등록증의 10자리 숫자를 다시 확인해 주세요.";
    if (!ownerName.trim()) errs.ownerName = "사업자등록증에 적힌 대표자 이름을 입력해 주세요.";
    const dateDigits = openDate.replace(/\D/g, "");
    if (!dateDigits) errs.openDate = "개업일을 입력해 주세요.";
    else if (!isRealDate(dateDigits)) errs.openDate = "개업일 8자리를 2020.03.01 처럼 입력해 주세요.";
    else if (dateDigits > todayLocal().replace(/-/g, "")) errs.openDate = "개업일이 오늘보다 뒤일 수 없어요.";
    if (!businessName.trim()) errs.businessName = "사업자등록증의 상호를 입력해 주세요.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setBusy(true);
    setServerError(null);
    setMismatch(false);
    try {
      const updated = await submitVerification(venue.id, {
        bizNo: digits,
        ownerName: ownerName.trim(),
        openDate: dateDigits,
        businessName: businessName.trim(),
      });
      const venues = await reloadVenues();
      const latest = venues.find((v) => v.id === venue.id) ?? updated;
      onDone(latest ? verificationStep(latest) : "pending");
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err instanceof PartnerApiError && err.status === 422) {
        setServerError(wasVerified ? `${err.message} 기존 인증은 그대로 유지돼요.` : err.message);
        setMismatch(true);
      } else {
        setServerError(err instanceof PartnerApiError ? err.message : "확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      // 배너가 렌더된 뒤 스크롤·포커스(스크린리더도 오류로 이동)
      window.setTimeout(() => {
        errorRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        errorRef.current?.focus({ preventScroll: true });
      }, 0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="p-card" onSubmit={submit} noValidate>
      <h2 className="p-card-title">사업자 인증</h2>
      <p className="p-sub">
        인증 매장만 발도장 앱에 공개되고, 손님 체크인을 받을 수 있어요. 국세청 등록 정보로 바로 확인해요.
      </p>

      {serverError && (
        <div ref={errorRef} tabIndex={-1} className="p-banner p-banner--danger vf-server-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {prev && (
        <p className="p-hint vf-prev-note">
          이전에 입력한 사업자번호({prev.bizNoMasked})와 대표자명({prev.ownerNameMasked})은 가려져 있어 다시 입력해 주세요.
        </p>
      )}

      <label className="p-field">
        <span className="p-label">사업자등록번호</span>
        <input
          className="p-input vf-mono"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000-00-00000"
          value={bizNo}
          onChange={(e) => setBizNo(formatBizNo(e.target.value))}
          aria-invalid={!!errors.bizNo || mismatch}
        />
        {errors.bizNo && <span className="p-error vf-err">{errors.bizNo}</span>}
      </label>

      <label className="p-field">
        <span className="p-label">대표자명</span>
        <input className="p-input" autoComplete="off" value={ownerName} maxLength={30} onChange={(e) => setOwnerName(e.target.value)} aria-invalid={!!errors.ownerName || mismatch} />
        {errors.ownerName && <span className="p-error vf-err">{errors.ownerName}</span>}
      </label>

      <label className="p-field">
        <span className="p-label">개업일</span>
        <input
          className="p-input vf-mono"
          inputMode="numeric"
          autoComplete="off"
          placeholder="2020.03.01"
          value={openDate}
          onChange={(e) => setOpenDate(formatDateDots(e.target.value))}
          aria-invalid={!!errors.openDate || mismatch}
        />
        <span className="p-hint vf-field-hint">
          등록증의 '개업연월일' 8자리를 그대로 적어 주세요. 등록증이 없으면 홈택스에서 '사업자등록증 재발급'으로 볼 수 있어요.
        </span>
        {errors.openDate && <span className="p-error vf-err">{errors.openDate}</span>}
      </label>

      <label className="p-field">
        <span className="p-label">상호</span>
        <input className="p-input" autoComplete="off" value={businessName} maxLength={60} onChange={(e) => setBusinessName(e.target.value)} aria-invalid={!!errors.businessName} />
        <span className="p-hint vf-field-hint">
          <b>등록증의 상호와 글자 그대로 같은지</b> 확인해 주세요. 매장명과 다르면 운영팀이 한 번 더 확인해요.
        </span>
        {errors.businessName && <span className="p-error vf-err">{errors.businessName}</span>}
      </label>

      <button type="submit" className="p-btn p-btn--primary p-btn--block" disabled={busy}>
        {busy ? "국세청 정보 확인 중…" : "인증하기"}
      </button>
      {isNew && (
        <Link className="p-link p-link--center" to="/partner/poster?welcome=1">
          나중에 할게요
        </Link>
      )}
      <p className="p-fine">입력한 정보는 확인에만 쓰고, 앱이나 손님에게 보이지 않아요.</p>
    </form>
  );
}

/** 확인 중: 입력한 상호와 매장명 비교(서버가 상호를 내려줄 때만). */
function PendingCompare({ venue }: { venue: Venue }) {
  const [info, setInfo] = useState<VerificationInfo | null>(null);
  useEffect(() => {
    let alive = true;
    fetchVerificationInfo(venue.id)
      .then((i) => alive && setInfo(i))
      .catch(() => {
        // 비교는 부가 정보 — 실패하면 생략
      });
    return () => {
      alive = false;
    };
  }, [venue.id]);
  if (!info?.businessName) return null;
  return (
    <dl className="vf-compare">
      <div>
        <dt>입력한 상호</dt>
        <dd>{info.businessName}</dd>
      </div>
      <div>
        <dt>매장명</dt>
        <dd>{venue.name}</dd>
      </div>
    </dl>
  );
}

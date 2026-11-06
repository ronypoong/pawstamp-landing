import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resizeImage } from "../../lib/imageResize";
import { PartnerApiError, submitVerification, verificationStep, type Venue } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

const FILE_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf";

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

function todayLocal(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/**
 * 사업자 인증(/partner/verify). 매장 등록 직후 단계.
 * 제출 → 운영팀 확인 중(PENDING) → 인증 매장(VERIFIED) / 반려(REJECTED, 사유 + 다시 제출).
 */
export function PartnerVerifyPage() {
  const { venue } = usePartner();
  const [params] = useSearchParams();
  const [resubmit, setResubmit] = useState(false);
  const isNew = params.get("new") === "1";

  useEffect(() => {
    document.title = "사업자 인증 — 발도장 파트너";
  }, []);

  if (!venue) return null;
  const step = verificationStep(venue);

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        {isNew && <p className="p-eyebrow">2단계 · 사업자 인증</p>}
        <h1 className="p-title">{venue.name}</h1>
      </header>

      {step === "verified" && (
        <section className="p-card vf-state">
          <span className="vf-badge vf-badge--ok">인증 매장</span>
          <p className="vf-state-title">사업자 인증이 끝났어요</p>
          <p className="p-sub">발도장 앱에 공개되고, 손님 체크인을 받을 수 있어요.</p>
          <Link className="p-btn p-btn--primary p-btn--block" to="/partner/poster">
            QR 포스터 출력하기
          </Link>
        </section>
      )}

      {step === "pending" && !resubmit && (
        <section className="p-card vf-state">
          <span className="vf-badge">확인 중</span>
          <p className="vf-state-title">운영팀이 확인하고 있어요</p>
          <p className="p-sub">
            보통 1영업일 안에 끝나요. 결과는 로그인 이메일로 알려 드려요. 그동안 매장 꾸미기와 포스터 준비를 미리 해 두세요.
          </p>
          <div className="vf-actions">
            <Link className="p-btn p-btn--primary" to="/partner/profile">
              매장 꾸미기
            </Link>
            <Link className="p-btn p-btn--ghost" to="/partner/poster">
              포스터 미리 보기
            </Link>
          </div>
          <button type="button" className="p-link" onClick={() => setResubmit(true)}>
            제출한 내용을 고쳐서 다시 낼게요
          </button>
        </section>
      )}

      {step === "rejected" && (
        <div className="p-banner vf-rejected" role="status">
          <div>
            <span className="vf-badge vf-badge--danger">다시 제출 필요</span>
            <p className="vf-rejected-title">한 가지만 고쳐 주세요</p>
            {venue.verificationRejectReason && <p className="vf-rejected-reason">{venue.verificationRejectReason}</p>}
            <p className="vf-rejected-body">아래에서 고쳐 다시 내 주시면 다시 확인해 드려요.</p>
          </div>
        </div>
      )}

      {(step === "unsubmitted" || step === "rejected" || resubmit) && <VerifyForm venue={venue} isNew={isNew} />}
    </div>
  );
}

function VerifyForm({ venue, isNew }: { venue: Venue; isNew: boolean }) {
  const navigate = useNavigate();
  const { reloadVenues, handleAuthError } = usePartner();
  const [bizNo, setBizNo] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (f.size > FILE_MAX_BYTES && f.type === "application/pdf") {
      setErrors((e) => ({ ...e, file: "10MB 이하 파일만 올릴 수 있어요." }));
      return;
    }
    setFile(f);
    setErrors((e) => ({ ...e, file: "" }));
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const digits = bizNo.replace(/\D/g, "");
    const errs: Record<string, string> = {};
    if (!isValidBizNo(digits)) errs.bizNo = "번호가 맞지 않아요. 등록증의 10자리 숫자를 다시 확인해 주세요.";
    if (!ownerName.trim()) errs.ownerName = "사업자등록증에 적힌 대표자 이름을 입력해 주세요.";
    if (!openDate) errs.openDate = "개업일을 입력해 주세요.";
    else if (openDate > todayLocal()) errs.openDate = "개업일이 오늘보다 뒤일 수 없어요.";
    if (!file) errs.file = "사업자등록증 사진을 올려 주세요.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean) || !file) return;

    setBusy(true);
    setSubmitError(null);
    setProgress(0);
    try {
      const prepared = file.type === "application/pdf" ? { blob: file as Blob, name: file.name } : await resizeImage(file);
      if (prepared.blob.size > FILE_MAX_BYTES) throw new PartnerApiError(413, "10MB 이하 파일만 올릴 수 있어요.");
      await submitVerification(
        venue.id,
        { bizNo: digits, ownerName: ownerName.trim(), openDate: openDate.replace(/-/g, ""), file: prepared.blob, fileName: prepared.name },
        setProgress,
      );
      await reloadVenues();
      navigate(isNew ? "/partner/poster?welcome=1" : "/partner/verify", { replace: true });
    } catch (err) {
      if (handleAuthError(err)) return;
      setSubmitError(err instanceof PartnerApiError ? err.message : "제출하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="p-card" onSubmit={submit} noValidate>
      <h2 className="p-card-title">사업자 인증</h2>
      <p className="p-sub">인증 매장만 발도장 앱에 공개되고, 손님 체크인을 받을 수 있어요.</p>

      <label className="p-field">
        <span className="p-label">사업자등록번호</span>
        <input
          className="p-input vf-bizno"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000-00-00000"
          value={bizNo}
          onChange={(e) => setBizNo(formatBizNo(e.target.value))}
          aria-invalid={!!errors.bizNo}
        />
        {errors.bizNo && <span className="p-error vf-err">{errors.bizNo}</span>}
      </label>

      <label className="p-field">
        <span className="p-label">대표자명</span>
        <input className="p-input" autoComplete="off" value={ownerName} maxLength={30} onChange={(e) => setOwnerName(e.target.value)} aria-invalid={!!errors.ownerName} />
        {errors.ownerName && <span className="p-error vf-err">{errors.ownerName}</span>}
      </label>

      <label className="p-field">
        <span className="p-label">개업일</span>
        <input className="p-input" type="date" max={todayLocal()} value={openDate} onChange={(e) => setOpenDate(e.target.value)} aria-invalid={!!errors.openDate} />
        {errors.openDate && <span className="p-error vf-err">{errors.openDate}</span>}
      </label>

      <div className="p-field">
        <span className="p-label">사업자등록증</span>
        <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
        {file ? (
          <div className="vf-file">
            {preview ? <img src={preview} alt="사업자등록증 미리보기" /> : <span className="vf-file-icon">PDF</span>}
            <span className="vf-file-name">{file.name}</span>
            <button type="button" className="p-btn p-btn--ghost p-btn--sm" onClick={() => fileRef.current?.click()}>
              바꾸기
            </button>
          </div>
        ) : (
          <button type="button" className="vf-drop" onClick={() => fileRef.current?.click()}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            사진 찍거나 파일 올리기
            <small>글자가 잘 보이게 전체가 나오도록 찍어 주세요 (jpg·png·heic·pdf, 10MB 이하)</small>
          </button>
        )}
        {errors.file && <span className="p-error vf-err">{errors.file}</span>}
      </div>

      {submitError && <p className="p-error" role="alert">{submitError}</p>}
      <button type="submit" className="p-btn p-btn--primary p-btn--block" disabled={busy}>
        {busy ? `제출 중… ${Math.round(progress * 100)}%` : "인증 요청하기"}
      </button>
      {isNew && (
        <Link className="p-link p-link--center" to="/partner/poster?welcome=1">
          나중에 할게요
        </Link>
      )}
      <p className="p-fine">
        운영팀 확인은 보통 1영업일 걸려요. 사업자등록증과 대표자 정보는 매장 확인에만 쓰고, 앱이나 손님에게 보이지 않아요.
      </p>
    </form>
  );
}

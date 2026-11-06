import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PartnerApiError, sendPartnerCode, verifyPartnerCode } from "../../lib/partnerApi";
import { PartnerShell } from "./PartnerLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

function errorMessage(e: unknown): string {
  return e instanceof PartnerApiError ? e.message : "잠시 후 다시 시도해 주세요.";
}

/** /partner 하위 경로만 next 로 허용(오픈 리다이렉트 방지). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/partner/") && !next.startsWith("/partner/login") ? next : "/partner/dashboard";
}

/** 이메일 → 6자리 코드. 처음이면 자동으로 가입된다. */
export function PartnerLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "로그인 — 발도장 파트너";
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("이메일 주소를 다시 확인해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPartnerCode(trimmed);
      setEmail(trimmed);
      setCode("");
      setStep("code");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("메일로 받은 6자리 숫자를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyPartnerCode(email, code);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <PartnerShell>
      <main className="p-main p-main--narrow">
        <section className="p-card p-login">
          {step === "email" ? (
            <form onSubmit={send} noValidate>
              <h1 className="p-title">사장님, 이메일로 시작해요</h1>
              <p className="p-sub">처음이면 바로 가입되고, 이미 가입했다면 로그인돼요. 비밀번호는 없어요.</p>
              <label className="p-field">
                <span className="p-label">이메일</span>
                <input
                  className="p-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </label>
              {error && <p className="p-error" role="alert">{error}</p>}
              <button type="submit" className="p-btn p-btn--primary p-btn--block" disabled={busy}>
                {busy ? "보내는 중…" : "인증 코드 받기"}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} noValidate>
              <h1 className="p-title">메일로 받은 코드를 입력해 주세요</h1>
              <p className="p-sub">
                <b>{email}</b> 로 6자리 코드를 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요.
              </p>
              <label className="p-field">
                <span className="p-label">인증 코드</span>
                <input
                  ref={codeRef}
                  className="p-input p-input--code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </label>
              {error && <p className="p-error" role="alert">{error}</p>}
              <button type="submit" className="p-btn p-btn--primary p-btn--block" disabled={busy || code.length !== 6}>
                {busy ? "확인 중…" : "확인"}
              </button>
              <div className="p-login-links">
                <button
                  type="button"
                  className="p-link"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                  }}
                >
                  이메일 바꾸기
                </button>
                <button type="button" className="p-link" disabled={busy || cooldown > 0} onClick={() => void send()}>
                  {cooldown > 0 ? `코드 다시 받기 (${cooldown}초)` : "코드 다시 받기"}
                </button>
              </div>
            </form>
          )}
        </section>
        <p className="p-fine">
          로그인하면 발도장 <a href="/terms">이용약관</a>과 <a href="/privacy">개인정보처리방침</a>에 동의한 것으로 봐요.
        </p>
      </main>
    </PartnerShell>
  );
}

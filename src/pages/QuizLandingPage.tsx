import { useEffect, useMemo, useState } from "react";

import { fetchActiveEvent, resolveQuiz, type QuizEvent, type QuizResultType } from "../lib/quizApi";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.pawstamp.mobile";
const APP_STORE_URL = "https://apps.apple.com/kr/app/pawstamp/id6778623989";

/** 결과 유형 테마(앱/티저 카드와 동일 팔레트). */
const THEME: Record<string, { from: string; to: string; accent: string; glow: string; emoji: string }> = {
  food: { from: "#ffc24b", to: "#ff8a3d", accent: "#e67700", glow: "#fff0c2", emoji: "🦴" },
  guard: { from: "#ff8a5b", to: "#ff5e7e", accent: "#e63950", glow: "#ffd9c2", emoji: "🛡️" },
  active: { from: "#5be0b0", to: "#3db8c4", accent: "#0ca678", glow: "#d3f9ec", emoji: "🎾" },
  love: { from: "#ff9ec4", to: "#c77dff", accent: "#d6336c", glow: "#ffe3f1", emoji: "💗" },
  cool: { from: "#8e9bff", to: "#6d7be0", accent: "#3b4bc8", glow: "#e0e4ff", emoji: "🌙" },
};

// 기기별 스토어 버튼. 모바일은 해당 OS 하나만, 데스크톱/미상은 둘 다 노출(iOS 유실 방지).
function storeLinks(referrer: string): { url: string; label: string }[] {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";
  // Play 스토어는 install referrer로 설치 출처를 넘길 수 있음(광고 성과 측정용).
  const play = {
    url: referrer ? `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent(referrer)}` : GOOGLE_PLAY_URL,
    label: "Google Play",
  };
  const appStore = { url: APP_STORE_URL, label: "App Store" };
  if (/iphone|ipad|ipod/i.test(ua)) return [appStore];
  if (/android/i.test(ua)) return [play];
  return [appStore, play];
}

/**
 * 성격검사 광고 랜딩(/quiz). 광고 클릭 → 웹에서 6문항 바로 풀고 → 결과 카드 즉시 확인 → 설치 유도.
 * resolve API는 저장하지 않으므로(웹 익명) 부담 없이 재미부터 준다.
 */
export function QuizLandingPage() {
  const [event, setEvent] = useState<QuizEvent | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<"intro" | "quiz" | "loading" | "result">("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<QuizResultType | null>(null);

  // 광고 유입 출처(utm) 보존 → Play 설치 referrer로 전달.
  const referrer = useMemo(() => {
    if (typeof window === "undefined") return "";
    const q = new URLSearchParams(window.location.search);
    const parts: string[] = [];
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const v = q.get(k);
      if (v) parts.push(`${k}=${v}`);
    }
    return parts.length ? parts.join("&") : "utm_source=quiz_landing";
  }, []);
  const stores = useMemo(() => storeLinks(referrer), [referrer]);

  useEffect(() => {
    document.title = "내 강아지 성격유형 검사 · 발도장";
    let mounted = true;
    fetchActiveEvent("PERSONA")
      .then((e) => mounted && setEvent(e))
      .catch(() => mounted && setFailed(true));
    return () => {
      mounted = false;
    };
  }, []);

  const questions = event?.questions ?? [];
  const total = questions.length;
  const theme = (result && THEME[result.themeKey]) || THEME.guard;

  const pick = async (optionId: string) => {
    const next = [...answers, optionId];
    setAnswers(next);
    if (step + 1 < total) {
      setStep(step + 1);
      return;
    }
    setPhase("loading");
    try {
      const r = await resolveQuiz(event!.code, next);
      setResult(r);
      setPhase("result");
    } catch {
      setFailed(true);
    }
  };

  const restart = () => {
    setAnswers([]);
    setStep(0);
    setResult(null);
    setPhase("quiz");
  };

  const share = async () => {
    const url = window.location.origin + "/quiz";
    const text = result ? `우리 강아지는 '${result.name}'! 너희 강아지는?` : "내 강아지 성격유형 검사";
    try {
      if (navigator.share) await navigator.share({ title: "발도장 성격검사", text, url });
      else {
        await navigator.clipboard.writeText(url);
        alert("링크를 복사했어요!");
      }
    } catch {
      /* 사용자가 공유 취소 */
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff9f0 0%, #fdf3e7 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 18px 48px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#e07a3f", letterSpacing: "0.02em", marginBottom: 18 }}>
          🐾 발도장 성격검사
        </p>

        {failed ? (
          <Fallback stores={stores} />
        ) : !event ? (
          <p style={{ color: "#8b8079", marginTop: 40 }}>불러오는 중…</p>
        ) : phase === "intro" ? (
          <section>
            <h1 style={{ fontSize: 27, fontWeight: 900, color: "#2b2520", lineHeight: 1.28, margin: "0 0 12px" }}>
              내 강아지는
              <br />
              무슨 성격일까?
            </h1>
            <p style={{ fontSize: 15, color: "#7a6f66", margin: "0 0 28px", lineHeight: 1.6 }}>
              30초, {total}개 질문이면 끝.
              <br />
              우리 아이만의 성격유형 카드를 받아보세요.
            </p>
            <div
              aria-hidden
              style={{ fontSize: 64, marginBottom: 28, filter: "drop-shadow(0 8px 16px rgba(224,122,63,0.25))" }}
            >
              🐶
            </div>
            <CtaButton onClick={() => setPhase("quiz")}>무료로 검사 시작하기</CtaButton>
            <p style={{ fontSize: 12, color: "#b3a79d", marginTop: 14 }}>회원가입 없이 바로 결과 확인</p>
          </section>
        ) : phase === "quiz" ? (
          <section>
            <div style={{ height: 6, borderRadius: 999, background: "#efe3d5", overflow: "hidden", marginBottom: 6 }}>
              <div
                style={{
                  height: "100%",
                  width: `${((step + 1) / total) * 100}%`,
                  background: "linear-gradient(90deg, #ffb054, #ff8a3d)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#b3a79d", textAlign: "right", margin: "0 0 20px" }}>
              {step + 1} / {total}
            </p>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: "#2b2520", lineHeight: 1.35, margin: "0 0 22px", minHeight: 58 }}>
              {questions[step]?.text}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {questions[step]?.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pick(o.id)}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 15,
                    border: "1.5px solid #f0e2d2",
                    background: "#fffdfb",
                    color: "#3a332d",
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.4,
                    boxShadow: "0 4px 14px -8px rgba(0,0,0,0.2)",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
        ) : phase === "loading" ? (
          <p style={{ color: "#8b8079", marginTop: 60 }}>우리 아이 성격을 분석하는 중… 🐾</p>
        ) : result ? (
          <section>
            <div
              style={{
                borderRadius: 26,
                padding: 18,
                background: `linear-gradient(145deg, ${theme.from}, ${theme.to})`,
                boxShadow: "0 18px 44px -16px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ borderRadius: 18, background: "#fffdfb", border: `1.5px solid ${theme.accent}55`, padding: 18 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    background: theme.glow,
                    boxShadow: `0 0 0 4px ${theme.accent}`,
                  }}
                  aria-hidden
                >
                  {theme.emoji}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    background: `${theme.accent}1a`,
                    color: theme.accent,
                  }}
                >
                  {result.rarityLabel ?? "희귀 유형"}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2b2520", margin: "8px 0 0", lineHeight: 1.2 }}>
                  {result.name}
                </h1>
                {result.tagline && (
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#6a5f57", margin: "6px 0 0" }}>{result.tagline}</p>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", textAlign: "left" }}>
                  {result.features.map((f, i) => (
                    <li key={i} style={{ fontSize: 13, fontWeight: 600, color: "#3a332d", margin: "6px 0", display: "flex", gap: 6 }}>
                      <span style={{ color: theme.accent }}>🐾</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#2e2823", margin: "26px 0 6px" }}>
              이 카드를 저장하고 더 알아보려면?
            </h2>
            <p style={{ fontSize: 13, color: "#8b8079", margin: "0 0 18px", lineHeight: 1.6 }}>
              발도장 앱에서 카드를 저장하고, 매일 산책·건강도 기록해보세요.
            </p>
            <StoreButtons stores={stores} />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <GhostButton onClick={share}>친구에게 공유</GhostButton>
              <GhostButton onClick={restart}>다시 하기</GhostButton>
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: "#b3a79d" }}>앱이 설치돼 있으면 카드가 앱에 저장돼요.</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function CtaButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "16px 0",
        borderRadius: 15,
        border: "none",
        background: "linear-gradient(135deg, #ff9a3d, #ff7a45)",
        color: "#fff",
        fontSize: 16,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: "0 12px 26px -10px rgba(255,122,69,0.7)",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "13px 0",
        borderRadius: 13,
        border: "1.5px solid #e7d8c6",
        background: "#fffdfb",
        color: "#6a5f57",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StoreButtons({ stores }: { stores: { url: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {stores.map((s) => (
        <CtaButton key={s.label} onClick={() => (window.location.href = s.url)}>
          {s.label}에서 발도장 받기
        </CtaButton>
      ))}
    </div>
  );
}

function Fallback({ stores }: { stores: { url: string; label: string }[] }) {
  return (
    <section style={{ marginTop: 30 }}>
      <div aria-hidden style={{ fontSize: 56, marginBottom: 16 }}>🐾</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#2b2520", margin: "0 0 10px" }}>내 강아지 성격유형 검사</h1>
      <p style={{ fontSize: 14, color: "#8b8079", margin: "0 0 24px" }}>발도장 앱에서 30초 성격 테스트를 즐겨보세요.</p>
      <StoreButtons stores={stores} />
    </section>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchResultType, type QuizResultType } from "../lib/quizApi";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.pawstamp.mobile";
const APP_STORE_URL = "https://apps.apple.com/kr/app/pawstamp/id6778623989";

/** 결과 유형 테마(앱 카드와 동일 팔레트). */
const THEME: Record<string, { from: string; to: string; accent: string; glow: string; emoji: string }> = {
  food: { from: "#ffc24b", to: "#ff8a3d", accent: "#e67700", glow: "#fff0c2", emoji: "🦴" },
  guard: { from: "#ff8a5b", to: "#ff5e7e", accent: "#e63950", glow: "#ffd9c2", emoji: "🛡️" },
  active: { from: "#5be0b0", to: "#3db8c4", accent: "#0ca678", glow: "#d3f9ec", emoji: "🎾" },
  love: { from: "#ff9ec4", to: "#c77dff", accent: "#d6336c", glow: "#ffe3f1", emoji: "💗" },
  cool: { from: "#8e9bff", to: "#6d7be0", accent: "#3b4bc8", glow: "#e0e4ff", emoji: "🌙" },
};

function detectStore(): { url: string; label: string } | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return { url: GOOGLE_PLAY_URL, label: "Google Play" };
  if (/iphone|ipad|ipod/i.test(ua)) return { url: APP_STORE_URL, label: "App Store" };
  return null;
}

/**
 * 성격검사 결과 공유 링크(/i/type/:typeCode)의 티저 랜딩.
 * - 앱 설치 시: OS 가 이 페이지 대신 앱을 바로 연다(유니버설/앱 링크, /i/* 경로).
 * - 미설치/데스크톱: 결과 유형 티저를 보여주고 "우리 아이도 해보기"로 설치 유도.
 */
export function PersonaTeaserPage() {
  const { typeCode = "" } = useParams();
  const [type, setType] = useState<QuizResultType | null>(null);
  const [failed, setFailed] = useState(false);
  const store = detectStore();
  const theme = (type && THEME[type.themeKey]) || THEME.guard;

  useEffect(() => {
    document.title = "발도장 성격검사";
    let mounted = true;
    fetchResultType(typeCode)
      .then((t) => mounted && setType(t))
      .catch(() => mounted && setFailed(true));
    return () => {
      mounted = false;
    };
  }, [typeCode]);

  const storeButtons = store
    ? [store]
    : [
        { url: GOOGLE_PLAY_URL, label: "Google Play" },
        { url: APP_STORE_URL, label: "App Store" },
      ];

  return (
    <article style={{ maxWidth: 460, margin: "0 auto", padding: "8px 4px 40px", textAlign: "center" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#8b8079", marginBottom: 14 }}>🐾 발도장 성격검사</p>

      {type ? (
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
              {type.rarityLabel ?? "희귀 유형"}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2b2520", margin: "8px 0 0", lineHeight: 1.2 }}>{type.name}</h1>
            {type.tagline && <p style={{ fontSize: 14, fontWeight: 600, color: "#6a5f57", margin: "6px 0 0" }}>{type.tagline}</p>}
            <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", textAlign: "left" }}>
              {type.features.map((f, i) => (
                <li key={i} style={{ fontSize: 13, fontWeight: 600, color: "#3a332d", margin: "6px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: theme.accent }}>🐾</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : failed ? (
        <div style={{ fontSize: 44 }} aria-hidden>🐾</div>
      ) : (
        <p style={{ color: "#8b8079" }}>결과를 불러오는 중…</p>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#2e2823", margin: "26px 0 6px" }}>우리 아이는 무슨 형일까?</h2>
      <p style={{ fontSize: 13, color: "#8b8079", margin: "0 0 18px" }}>
        발도장 앱에서 30초 성격 테스트로 확인하고 카드도 만들어보세요.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        {storeButtons.map((s) => (
          <a
            key={s.label}
            href={s.url}
            style={{
              display: "block",
              width: "100%",
              maxWidth: 320,
              padding: "14px 0",
              borderRadius: 14,
              background: "#111827",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {s.label}에서 우리 아이도 해보기
          </a>
        ))}
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: "#b3a79d" }}>앱이 이미 설치돼 있으면 이 링크는 자동으로 앱에서 열려요.</p>
    </article>
  );
}

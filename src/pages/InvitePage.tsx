import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.pawstamp.mobile";
const APP_STORE_URL = "https://apps.apple.com/kr/app/pawstamp/id6778623989";

/** 6자리 코드를 483 921 형태로 그룹핑. */
function formatCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : code;
}

/** User-Agent 로 기기 스토어 판별. 데스크톱/미상은 null. */
function detectStore(): { url: string; label: string } | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return { url: GOOGLE_PLAY_URL, label: "Google Play" };
  if (/iphone|ipad|ipod/i.test(ua)) return { url: APP_STORE_URL, label: "App Store" };
  return null;
}

/**
 * 공동보호자 초대 링크(/i/:code)의 랜딩.
 * - 앱 설치 시: OS 가 이 페이지 대신 앱을 바로 연다(유니버설/앱 링크).
 * - 미설치 시: 기기에 맞는 스토어로 자동 이동. (공유번호는 공유 메시지에도 함께 담겨 있어 설치 후 입력 가능)
 */
export function InvitePage() {
  const { code = "" } = useParams();
  const [store] = useState(detectStore);

  useEffect(() => {
    document.title = "공동 보호자 초대 — 발도장";
  }, []);

  // 기기가 판별되면 해당 스토어로 자동 이동(설치 페이지). 데스크톱은 이동하지 않고 안내만.
  useEffect(() => {
    if (store) {
      const timer = window.setTimeout(() => window.location.replace(store.url), 600);
      return () => window.clearTimeout(timer);
    }
  }, [store]);

  return (
    <article className="privacy-page" style={{ textAlign: "center", maxWidth: 420 }}>
      <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>
        🐾
      </div>
      <h1 style={{ marginTop: 12 }}>발도장 공동 보호자 초대</h1>
      <p className="updated" style={{ marginTop: 6 }}>
        {store ? "설치 페이지로 이동 중이에요…" : "발도장 앱을 설치하고 함께 돌봐요."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22, alignItems: "center" }}>
        {(store ? [store] : [
          { url: GOOGLE_PLAY_URL, label: "Google Play" },
          { url: APP_STORE_URL, label: "App Store" },
        ]).map((s) => (
          <a
            key={s.label}
            href={s.url}
            style={{ display: "block", width: "100%", maxWidth: 320, padding: "14px 0", borderRadius: 14, background: "#111827", color: "#fff", fontWeight: 700, textDecoration: "none" }}
          >
            {s.label}에서 설치
          </a>
        ))}
      </div>

      {code && (
        <p className="updated" style={{ marginTop: 20, fontSize: 13, lineHeight: 1.6 }}>
          설치 후 <b>반려동물 추가 → 초대코드로 함께 돌보기</b>에서
          <br /> 공유번호 <b style={{ letterSpacing: "0.08em" }}>{formatCode(code)}</b> 를 입력하세요.
        </p>
      )}

      <p className="updated" style={{ marginTop: 16, fontSize: 12 }}>
        앱이 이미 설치돼 있으면 이 링크는 자동으로 앱에서 열려요.
      </p>
    </article>
  );
}

import { useEffect } from "react";
import { useParams } from "react-router-dom";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.pawstamp.mobile";
const APP_STORE_URL = "https://apps.apple.com/kr/app/pawstamp/id6778623989";

/** 6자리 코드를 483 921 형태로 그룹핑. */
function formatCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : code;
}

/**
 * 공동보호자 초대 링크(/i/:code)의 랜딩.
 * - 앱이 설치돼 있으면 OS 가 이 페이지 대신 앱을 바로 연다(유니버설/앱 링크).
 * - 미설치 상태에서 열리면 이 페이지가 뜨고, 스토어 설치 + 공유번호 입력을 안내한다.
 */
export function InvitePage() {
  const { code = "" } = useParams();

  useEffect(() => {
    const previous = document.title;
    document.title = "공동 보호자 초대 — 발도장";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <article className="privacy-page" style={{ textAlign: "center", maxWidth: 420 }}>
      <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>
        🐾
      </div>
      <h1 style={{ marginTop: 12 }}>발도장 공동 보호자 초대</h1>
      <p className="updated" style={{ marginTop: 6 }}>
        가족이 반려동물을 함께 돌보자고 초대했어요.
      </p>

      {code && (
        <div
          style={{
            margin: "24px auto 0",
            padding: "20px 16px",
            borderRadius: 20,
            background: "rgba(56,189,248,0.10)",
            maxWidth: 320,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>공유번호</div>
          <div style={{ marginTop: 8, fontSize: 34, fontWeight: 800, letterSpacing: "0.12em", fontVariantNumeric: "tabular-nums" }}>
            {formatCode(code)}
          </div>
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.6 }}>
        발도장 앱을 설치한 뒤 <b>반려동물 추가 → 초대코드로 함께 돌보기</b>에서
        <br /> 위 공유번호를 입력하면 참여돼요.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, alignItems: "center" }}>
        <a
          href={GOOGLE_PLAY_URL}
          style={{ display: "block", width: "100%", maxWidth: 320, padding: "14px 0", borderRadius: 14, background: "#111827", color: "#fff", fontWeight: 700, textDecoration: "none" }}
        >
          Android · Google Play에서 설치
        </a>
        <a
          href={APP_STORE_URL}
          style={{ display: "block", width: "100%", maxWidth: 320, padding: "14px 0", borderRadius: 14, background: "#111827", color: "#fff", fontWeight: 700, textDecoration: "none" }}
        >
          iPhone · App Store에서 설치
        </a>
      </div>

      <p className="updated" style={{ marginTop: 20, fontSize: 12 }}>
        앱이 이미 설치돼 있으면 이 링크는 자동으로 앱에서 열려요.
      </p>
    </article>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BrandPaw } from "../components/BrandPaw";
import { APP_STORE_URL, GOOGLE_PLAY_URL, detectStoreTarget } from "../lib/storeTarget";
import { fetchPublicVenue, type PublicVenue } from "../lib/venueCheckinApi";

type State = { kind: "loading" } | { kind: "ok"; venue: PublicVenue } | { kind: "notfound" } | { kind: "error" };

const STORES = {
  ios: { url: APP_STORE_URL, label: "App Store에서 받기" },
  android: { url: GOOGLE_PLAY_URL, label: "Google Play에서 받기" },
} as const;

/**
 * 매장 체크인 QR(/i/checkin/:code)의 미설치 안내 페이지.
 * 앱이 설치돼 있으면 OS 가 유니버설/앱 링크로 앱 체크인 화면을 바로 열기 때문에, 여기 오는 건 대부분 미설치 사용자다.
 * 매장 앞에서 찍은 상황이라 자동 이동하지 않고 매장명·이유를 먼저 보여준 뒤 스토어 버튼을 준다.
 */
export function CheckinInstallPage() {
  const { code = "" } = useParams();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [target] = useState(detectStoreTarget);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "매장 체크인 — 발도장";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => {
      document.title = prevTitle;
      robots.remove();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchPublicVenue(code)
      .then((venue) => alive && setState(venue ? { kind: "ok", venue } : { kind: "notfound" }))
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [code]);

  const venueName = state.kind === "ok" ? state.venue.venueName : null;
  const stores = target === "desktop" ? [STORES.ios, STORES.android] : [STORES[target]];

  return (
    <article className="checkin-page">
      <div className="checkin-seal" aria-hidden>
        <BrandPaw size={56} />
      </div>

      {state.kind === "loading" && <div className="pass-skeleton checkin-skeleton" aria-busy="true" aria-label="불러오는 중" />}

      {state.kind === "notfound" && (
        <>
          <h1 className="checkin-title">지금은 체크인을 받지 않는 QR이에요</h1>
          <p className="checkin-body">매장 직원에게 새 QR이 있는지 물어봐 주세요.</p>
        </>
      )}

      {(state.kind === "ok" || state.kind === "error") && (
        <>
          {venueName && (
            <>
              <p className="checkin-venue-label">체크인하려는 매장</p>
              <p className="checkin-venue">{venueName}</p>
            </>
          )}
          <h1 className="checkin-title">
            {venueName ? "체크인하려면 발도장 앱이 필요해요" : "매장 체크인은 발도장 앱에서 할 수 있어요"}
          </h1>
          <p className="checkin-body">
            앱에 반려견 접종 기록을 담아 두면, QR을 찍는 것만으로 펫 패스를 보내고 방문 도장을 받을 수 있어요.
          </p>
        </>
      )}

      {state.kind !== "loading" && (
        <>
          <div className="checkin-stores">
            {stores.map((s, i) => (
              <a key={s.url} className={`p-btn ${i === 0 ? "p-btn--primary" : "p-btn--ghost"} p-btn--block`} href={s.url}>
                {s.label}
              </a>
            ))}
          </div>
          <ol className="checkin-steps">
            <li>앱 설치 후 반려견을 등록하고 접종 기록을 담아요</li>
            <li>매장의 QR을 다시 찍으면 체크인 화면이 열려요</li>
          </ol>
          <p className="checkin-note">이미 앱이 있다면 휴대폰 카메라로 QR을 다시 찍어 주세요. 앱에서 바로 열려요.</p>
        </>
      )}
    </article>
  );
}

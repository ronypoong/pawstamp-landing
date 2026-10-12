import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BrandPaw } from "../components/BrandPaw";
import { APP_STORE_URL, GOOGLE_PLAY_URL, detectStoreTarget } from "../lib/storeTarget";
import {
  VaccinePassClosedError,
  fetchVaccinePass,
  type VaccinePass,
  type VaccinePassItem,
  type VaccineStatus,
} from "../lib/vaccinePassApi";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: VaccinePass }
  | { kind: "closed" }
  | { kind: "error" };

const BADGE_LABEL: Record<VaccineStatus, string> = {
  valid: "유효",
  expiring: "임박",
  expired: "만료",
  missing: "미등록",
};

const STATUS_TITLE: Record<VaccineStatus, string> = {
  valid: "필수 접종 모두 유효",
  expiring: "유효 · 곧 만료되는 접종 있음",
  expired: "만료된 접종이 있어요",
  missing: "등록 안 된 접종이 있어요",
};

/** 전체 상태 우선순위: 만료 > 미등록 > 임박 > 유효. */
function overallStatus(items: VaccinePassItem[]): VaccineStatus {
  if (items.some((i) => i.status === "expired")) return "expired";
  if (items.length === 0 || items.some((i) => i.status === "missing")) return "missing";
  if (items.some((i) => i.status === "expiring")) return "expiring";
  return "valid";
}

/** "YYYY-MM-DD" → "YYYY.MM.DD" */
function formatDate(d: string | null): string {
  return d ? d.slice(0, 10).replace(/-/g, ".") : "";
}

/** ISO 시각 → KST "YYYY.MM.DD HH:mm" */
function formatKst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}.${p("month")}.${p("day")} ${p("hour")}:${p("minute")}`;
}

function StatusIcon({ status }: { status: VaccineStatus | "closed" }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (status) {
    case "valid":
      return <svg {...common}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
    case "expiring":
      return <svg {...common}><path d="M12 7v6" /><path d="M12 17h.01" /></svg>;
    case "expired":
      return <svg {...common}><path d="M7 7l10 10M17 7L7 17" /></svg>;
    case "missing":
      return <svg {...common}><path d="M9.2 9a3 3 0 0 1 5.6 1.2c0 2-2.8 2.4-2.8 4" /><path d="M12 17.5h.01" /></svg>;
    case "closed":
      return <svg {...common} strokeWidth={2.2}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>;
  }
}

function ClipIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" />
    </svg>
  );
}

function PetPhoto({ pet }: { pet: VaccinePass["pet"] }) {
  const sources = [pet.photoThumbnailUrl, pet.photoUrl].filter((s): s is string => !!s);
  const [idx, setIdx] = useState(0);
  if (idx >= sources.length) {
    return (
      <div className="pass-pet-photo pass-pet-initial" aria-hidden>
        {pet.name.trim().charAt(0) || "?"}
      </div>
    );
  }
  return <img className="pass-pet-photo" src={sources[idx]} alt="" onError={() => setIdx((i) => i + 1)} />;
}

/** 앱 받기: 기기 OS 에 맞는 스토어로. 데스크톱은 홈(두 스토어 안내)으로. */
function storeUrl(): string {
  const target = detectStoreTarget();
  if (target === "ios") return APP_STORE_URL;
  if (target === "android") return GOOGLE_PLAY_URL;
  return "/";
}

function PassFooter() {
  const [href] = useState(storeUrl);
  return (
    <footer className="pass-footer">
      <span className="pass-footer-brand">
        <BrandPaw size={20} />
        발도장으로 만든 접종 카드
      </span>
      <a className="pass-footer-cta" href={href}>
        앱 받기 ›
      </a>
    </footer>
  );
}

/**
 * 접종 확인 QR 웹 페이지(/i/pass/:token).
 * 보호자가 앱에서 발급한 24시간 링크를 애견카페·호텔 직원이 열어보는 용도.
 * 앱이 설치된 폰에서도 웹으로 열리도록 AASA 에서 /i/pass/* 는 유니버설 링크 제외.
 */
export function VaccinePassPage() {
  const { token = "" } = useParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "접종 확인 — 발도장";
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
    setState({ kind: "loading" });
    fetchVaccinePass(token)
      .then((data) => alive && setState({ kind: "ok", data }))
      .catch((e) => alive && setState(e instanceof VaccinePassClosedError ? { kind: "closed" } : { kind: "error" }));
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <main className="pass-page">
      {state.kind === "loading" && (
        <div aria-busy="true" aria-label="불러오는 중">
          <div className="pass-skeleton pass-skeleton-status" />
          <div className="pass-skeleton pass-skeleton-row" />
          <div className="pass-skeleton pass-skeleton-row" />
        </div>
      )}

      {state.kind === "closed" && (
        <section className="pass-status pass-closed">
          <span className="pass-status-icon">
            <StatusIcon status="closed" />
          </span>
          <div>
            <h1 className="pass-status-title">이 링크는 더 이상 열 수 없어요</h1>
            <p className="pass-status-body">보호자에게 새 QR을 요청해 주세요</p>
          </div>
        </section>
      )}

      {state.kind === "error" && (
        <section className="pass-status pass-closed">
          <span className="pass-status-icon">
            <StatusIcon status="missing" />
          </span>
          <div>
            <h1 className="pass-status-title">정보를 불러오지 못했어요</h1>
            <p className="pass-status-body">잠시 후 다시 열어 주세요</p>
          </div>
        </section>
      )}

      {state.kind === "ok" && <PassContent data={state.data} />}

      <PassFooter />
    </main>
  );
}

function PassContent({ data }: { data: VaccinePass }) {
  const items = data.requiredVaccinations;
  const status = overallStatus(items);
  const allMissing = items.every((i) => i.status === "missing");
  const title = allMissing ? "접종 기록이 아직 없어요" : STATUS_TITLE[status];

  return (
    <>
      <section className={`pass-status pass-status--${status}`} role="status">
        <span className="pass-status-icon">
          <StatusIcon status={status} />
        </span>
        <h1 className="pass-status-title">{title}</h1>
      </section>

      <div className="pass-pet">
        <PetPhoto pet={data.pet} />
        <div>
          <div className="pass-pet-name">{data.pet.name}</div>
          {data.pet.breed && <div className="pass-pet-breed">{data.pet.breed}</div>}
        </div>
      </div>

      <ul className="pass-list">
        {items.map((item) => (
          <li key={item.code} className="pass-item">
            <div className="pass-item-head">
              <span className="pass-item-name">
                {item.name}
                {item.matchedVaccineName && item.matchedVaccineName !== item.name && (
                  <small className="pass-item-matched">{item.matchedVaccineName}</small>
                )}
              </span>
              <span className={`pass-badge pass-badge--${item.status}`}>{BADGE_LABEL[item.status]}</span>
            </div>
            <div className="pass-item-dates">
              {item.administeredAt || item.expiresAt
                ? [
                    item.administeredAt && `접종 ${formatDate(item.administeredAt)}`,
                    item.expiresAt && `만료 ${formatDate(item.expiresAt)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "기록 없음"}
            </div>
            {item.hasProof && (
              <div className="pass-proof">
                <ClipIcon />
                증빙 첨부
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="pass-meta">
        <p>{formatKst(data.checkedAt)} 확인 · 발도장 앱 기록</p>
        <p>
          보호자가 발도장 앱에 기록한 정보로, 공식 접종증명서는 아니에요. 정확한 확인이 필요하면 동물병원 기록을 요청해
          주세요.
        </p>
        <p>이 링크는 {formatKst(data.expiresAt)} 까지 유효해요</p>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BrandPaw } from "../../components/BrandPaw";
import { QrCode } from "../../components/QrCode";
import { verificationStep } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";
import { VenueTitle } from "./VenueTitle";

type PaperSize = "A4" | "A5";

const PAPER_LABEL: Record<PaperSize, string> = { A4: "A4 · 입구·벽", A5: "A5 · 카운터 스탠드" };

/** 매장 QR 포스터. 화면은 미리보기, 인쇄 시 포스터 한 장만 나온다(@media print + 동적 @page). */
export function PartnerPosterPage() {
  const { venue } = usePartner();
  const [params, setParams] = useSearchParams();
  const [size, setSize] = useState<PaperSize>("A4");
  const [copied, setCopied] = useState(false);
  const welcome = params.get("welcome") === "1";

  useEffect(() => {
    document.title = "QR 포스터 — 발도장 파트너";
  }, []);

  // 인쇄 용지 크기는 @page 로만 지정 가능 → 선택값에 맞춰 스타일 주입.
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@page { size: ${size}; margin: 0; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [size]);

  if (!venue) return null;
  const verified = verificationStep(venue) === "verified";

  async function copyLink() {
    if (!venue) return;
    try {
      await navigator.clipboard.writeText(venue.checkinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("체크인 링크", venue.checkinUrl);
    }
  }

  return (
    <div className="poster-page">
      {welcome && (
        <div className="p-banner no-print" role="status">
          <BrandPaw size={22} />
          <div>
            <b>매장 등록이 끝났어요.</b> 포스터를 출력해 입구나 카운터에 붙이면 바로 체크인을 받을 수 있어요.
          </div>
          <button type="button" className="p-banner-close" aria-label="닫기" onClick={() => setParams({}, { replace: true })}>
            ×
          </button>
        </div>
      )}

      <div className="no-print">
        <VenueTitle suffix="QR 포스터" />
      </div>
      <div className="poster-layout">
        <aside className="poster-controls no-print">
          <p className="p-sub poster-sub-first">손님이 앱으로 찍으면 펫 패스가 오늘 방문 목록에 바로 들어와요.</p>

          <div className="p-field">
            <span className="p-label">용지 크기</span>
            <div className="p-segment" role="radiogroup" aria-label="용지 크기">
              {(Object.keys(PAPER_LABEL) as PaperSize[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={size === s}
                  className={size === s ? "active" : undefined}
                  onClick={() => setSize(s)}
                >
                  {PAPER_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="p-btn p-btn--primary p-btn--block" onClick={() => window.print()}>
            인쇄하기
          </button>
          <p className="p-hint">인쇄 창에서 'PDF로 저장'을 고르면 파일로 받아 인쇄소에 맡길 수도 있어요.</p>

          {!verified && (
            <p className="p-hint vf-poster-note">
              사업자 인증이 끝나기 전 포스터에는 '인증 후 인쇄해 주세요' 표시가 들어가요. 인증이 끝나면 표시 없이 인쇄할 수 있어요.
            </p>
          )}
          {!venue.active && (
            <p className="p-error">이 매장은 체크인 받기가 꺼져 있어요. 내 정보에서 다시 켤 수 있어요.</p>
          )}

          <div className="poster-link">
            <span className="p-label">체크인 링크</span>
            <code>{venue.checkinUrl}</code>
            <button type="button" className="p-btn p-btn--ghost p-btn--sm" onClick={() => void copyLink()}>
              {copied ? "복사했어요" : "링크 복사"}
            </button>
          </div>
          {welcome && (
            <Link className="p-link" to="/partner/dashboard">
              방문 현황 보러 가기 ›
            </Link>
          )}
        </aside>

        <div className="poster-preview">
          <article className={`poster-sheet poster-sheet--${size.toLowerCase()}${verified ? "" : " is-unverified"}`} aria-label={`${size} 포스터 미리보기`}>
            {!verified && (
              <div className="poster-watermark" aria-label="인증 후 인쇄해 주세요">
                <span>인증 후 인쇄해 주세요</span>
              </div>
            )}
            <div className="poster-inner">
            <header className="poster-top">
              <BrandPaw size={40} className="poster-seal" />
              <span>발도장 펫 패스 체크인</span>
            </header>
            <p className="poster-venue">{venue.name}</p>
            <h2 className="poster-headline">
              휴대폰 카메라로 찍고
              <br />
              <em>방문 도장</em> 받기
            </h2>
            <div className="poster-qr">
              <QrCode value={venue.checkinUrl} size="100%" label={`${venue.name} 체크인 QR`} />
            </div>
            <ol className="poster-steps">
              <li>
                <b>1</b>카메라로 찍기
              </li>
              <li>
                <b>2</b>반려견 고르기
              </li>
              <li>
                <b>3</b>도장 받기
              </li>
            </ol>
            <p className="poster-sub">앱이 없어도 괜찮아요. 찍으면 설치 안내가 나와요.</p>
            <p className="poster-legal">
              펫 패스는 보호자가 앱에 기록한 접종 정보를 보여주는 확인 보조 도구예요. 공식 증명서를 대신하지 않아요.
            </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

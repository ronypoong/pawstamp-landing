import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandPaw } from "../../components/BrandPaw";
import { getPartnerToken } from "../../lib/partnerApi";

const VALUES = [
  {
    title: "QR 한 장 붙이면 접종 확인이 끝나요",
    body: "손님이 입구 QR을 찍으면 반려견 이름·사진과 필수 접종 날짜·상태가 사장님 화면에 바로 떠요. 수첩을 한 장씩 넘겨 보지 않아도 돼요.",
  },
  {
    title: "우리 매장 단골·재방문을 한눈에",
    body: "몇 번째 방문인지, 어느 요일·시간대에 붐비는지, 자주 오는 반려견이 누구인지 자동으로 쌓여요.",
  },
  {
    title: "발도장 앱 사용자에게 우리 매장이 소개돼요",
    body: "앱의 나들이 장소에 '펫 패스 체크인 매장'으로 표시돼요. 앱에서 우리 매장을 몇 번 보고, 길찾기를 몇 번 눌렀는지도 알려 드려요.",
  },
];

const STEPS = [
  { title: "이메일로 가입", body: "비밀번호 없이 메일로 받은 코드만 넣으면 끝. 매장 이름을 검색해 연결해요." },
  { title: "포스터 붙이기", body: "A4·A5 포스터를 바로 인쇄해 입구나 카운터에 붙여요." },
  { title: "손님이 찍으면 끝", body: "손님이 휴대폰으로 QR을 찍고 펫 패스를 보내면, 사장님 화면에 실시간으로 떠요." },
];

const FAQ = [
  { q: "정말 무료인가요?", a: "네. 지금은 가입·포스터·방문 통계까지 모두 무료예요." },
  {
    q: "손님 개인정보가 보이나요?",
    a: "아니요. 손님이 보내기로 한 반려견 이름·견종·사진·접종 상태만 보여요. 보호자 이름·연락처·이메일은 보이지 않아요.",
  },
  {
    q: "앱이 없는 손님은요?",
    a: "QR을 휴대폰 카메라로 찍으면 발도장 설치 안내가 나와요. 설치 후 다시 찍으면 체크인돼요.",
  },
];

/** 사장님용 파트너 소개(/partner). 영업 없이 읽기만 해도 무엇을 얻는지 이해되도록. */
export function PartnerIntroPage() {
  const [loggedIn] = useState(() => !!getPartnerToken());
  const ctaTo = loggedIn ? "/partner/dashboard" : "/partner/login";
  const ctaLabel = loggedIn ? "내 매장 방문 현황 보기" : "이메일로 무료로 시작하기";

  useEffect(() => {
    const prev = document.title;
    document.title = "사장님을 위한 발도장 파트너 — 반려견 접종 확인 QR";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="pi">
      <section className="pi-hero">
        <div className="container pi-hero-grid">
          <div>
            <p className="pi-eyebrow">애견카페·호텔·미용실 사장님을 위한 발도장 파트너 · 무료</p>
            <h1 className="pi-title">
              QR 한 장 붙이면
              <br />
              손님 반려견 <span className="pi-accent">접종 확인</span>이 끝나요
            </h1>
            <p className="pi-lead">
              손님이 발도장 앱으로 입구 QR을 찍으면, 반려견 펫 패스가 사장님 화면에 바로 도착해요. 방문 기록과 단골 현황은 저절로
              쌓여요.
            </p>
            <div className="pi-cta-row">
              <Link className="p-btn p-btn--primary p-btn--lg" to={ctaTo}>
                {ctaLabel}
              </Link>
              <a className="p-btn p-btn--text" href="#how">
                어떻게 쓰나요?
              </a>
            </div>
          </div>
          <PreviewCard />
        </div>
      </section>

      <section className="container pi-section">
        <ul className="pi-values">
          {VALUES.map((v, i) => (
            <li key={v.title} className="pi-value">
              <span className="pi-value-no" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="pi-value-title">{v.title}</h2>
              <p className="pi-value-body">{v.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container pi-section" id="how">
        <h2 className="pi-h2">사용법은 3단계</h2>
        <ol className="pi-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="pi-step">
              <span className="pi-step-no">{i + 1}</span>
              <div>
                <h3 className="pi-step-title">{s.title}</h3>
                <p className="pi-step-body">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="container pi-section">
        <div className="pi-notice">
          <b>공식 증명서를 대신하지 않아요.</b> 펫 패스는 보호자가 앱에 기록한 접종 정보를 보여주는 확인 보조 도구예요. 정확한
          확인이 필요하면 동물병원 접종 기록을 요청해 주세요.
        </div>
      </section>

      <section className="container pi-section">
        <h2 className="pi-h2">자주 묻는 질문</h2>
        <dl className="pi-faq">
          {FAQ.map((f) => (
            <div key={f.q} className="pi-faq-item">
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="container pi-section pi-final">
        <BrandPaw size={44} />
        <h2 className="pi-h2">오늘 붙이고, 오늘부터 받아 보세요</h2>
        <Link className="p-btn p-btn--primary p-btn--lg" to={ctaTo}>
          {ctaLabel}
        </Link>
        <p className="p-fine">
          궁금한 점은 <a href="mailto:pawstamp@rubi-on.com">pawstamp@rubi-on.com</a> 으로 편하게 물어봐 주세요.
        </p>
      </section>
    </div>
  );
}

/** 히어로 오른쪽: 사장님 화면 미리보기(정적 예시). */
function PreviewCard() {
  const rows = [
    { name: "보리", breed: "웰시코기", time: "14:32", visit: "첫 방문", status: "valid" as const, label: "접종 유효" },
    { name: "초코", breed: "푸들", time: "14:05", visit: "12번째 방문", status: "valid" as const, label: "접종 유효" },
    { name: "콩이", breed: "말티즈", time: "13:48", visit: "3번째 방문", status: "expiring" as const, label: "곧 만료" },
  ];
  return (
    <div className="pi-preview" aria-label="사장님 화면 예시" role="img">
      <div className="pi-preview-head">
        <span>오늘 체크인</span>
        <span className="p-live">
          <span className="p-live-dot" aria-hidden />
          실시간
        </span>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.name} className="pi-preview-row">
            <span className="p-thumb p-thumb--initial" aria-hidden>
              {r.name.charAt(0)}
            </span>
            <span className="p-checkin-main">
              <span className="p-checkin-name">
                {r.name}
                <span className="p-checkin-breed">{r.breed}</span>
              </span>
              <span className="p-checkin-meta">
                {r.time} · {r.visit}
              </span>
            </span>
            <span className={`pass-badge pass-badge--${r.status}`}>{r.label}</span>
          </li>
        ))}
      </ul>
      <p className="pi-preview-caption">예시 화면이에요</p>
    </div>
  );
}

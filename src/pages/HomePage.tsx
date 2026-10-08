import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { PhoneMockup } from "../components/PhoneMockup";
import { BrandPaw } from "../components/BrandPaw";
import { AppleIcon, GooglePlayIcon, PawIcon, RainbowIcon, SyringeIcon, UsersIcon } from "../components/AppIcons";
import { APP_STORE_URL, GOOGLE_PLAY_URL, detectStoreTarget, type StoreTarget } from "../lib/storeTarget";

const STORES = {
  ios: { url: APP_STORE_URL, name: "App Store", label: "앱스토어에서 받기", Icon: AppleIcon },
  android: { url: GOOGLE_PLAY_URL, name: "Google Play", label: "구글플레이에서 받기", Icon: GooglePlayIcon },
} as const;

/** 스토어 배지. 모바일은 해당 OS 1개만 크게, 데스크톱/미상은 2개 모두. */
function StoreBadges({ target, inverse = false }: { target: StoreTarget; inverse?: boolean }) {
  const keys = target === "desktop" ? (["ios", "android"] as const) : [target];
  const single = keys.length === 1;
  return (
    <div className={`store-badges${single ? " store-badges--single" : ""}`}>
      {keys.map((key) => {
        const { url, name, Icon } = STORES[key];
        return (
          <a
            key={key}
            className={`store-badge${inverse ? " store-badge--inverse" : ""}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} 에서 발도장 다운로드`}
          >
            <Icon className="store-badge-ic" />
            <span className="store-badge-text">
              <span className="store-badge-top">다운로드</span>
              <span className="store-badge-name">{name}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

/** "누가 걸어간 자국" 한 줄 — 장식용 발자국 트레일. */
function PawTrail({ className }: { className: string }) {
  const steps = [
    { x: 8, y: 300, r: 20 },
    { x: 78, y: 236, r: 34 },
    { x: 118, y: 160, r: 18 },
    { x: 192, y: 102, r: 36 },
    { x: 228, y: 26, r: 22 },
  ];
  return (
    <svg className={className} viewBox="0 0 280 340" aria-hidden="true" focusable="false">
      {steps.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) rotate(${s.r} 16 16) scale(1.35)`}>
          <path d="M8.5 11.5c1.4 0 2.2 1.1 3.5 1.1s2.1-1.1 3.5-1.1c1.8 0 3.2 1.5 3.2 3.4 0 2.8-2.4 4.1-5.1 4.1h-3.2c-2.7 0-5.1-1.3-5.1-4.1 0-1.9 1.4-3.4 3.2-3.4Z" />
          <circle cx="6.7" cy="8.2" r="1.9" />
          <circle cx="10.3" cy="5.7" r="1.9" />
          <circle cx="13.7" cy="5.7" r="1.9" />
          <circle cx="17.3" cy="8.2" r="1.9" />
        </g>
      ))}
    </svg>
  );
}

function CheckMark() {
  return (
    <svg className="trust-check" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Value {
  icon: ReactNode;
  tone: "safe" | "grow" | "together";
  title: string;
  description: string;
  chips: string[];
}

const VALUES: Value[] = [
  {
    icon: <SyringeIcon />,
    tone: "safe",
    title: "기록이 쌓이는 안심",
    description: "사진 한 장이면 AI가 접종 증명서와 검사지를 읽어 정리해요. 만료 전엔 먼저 알려드려요.",
    chips: ["예방접종", "진료기록", "AI 자동입력", "알러지"],
  },
  {
    icon: <PawIcon />,
    tone: "grow",
    title: "매일 찍는 발도장",
    description: "오늘의 한 줄과 발도장이 모여 우리만의 성장 기록이 돼요. 생일과 가족이 된 날은 D-day로.",
    chips: ["오늘의 한 줄", "발도장", "기념일"],
  },
  {
    icon: <UsersIcon />,
    tone: "together",
    title: "함께라서 든든하게",
    description: "가족과 한 아이의 기록을 같이 보고, 동네 보호자와 고민을 나누고, 함께 갈 곳을 찾아요.",
    chips: ["공동 보호자", "커뮤니티", "펫플레이스"],
  },
];

/** 성격검사 결과 테마 5색 (QuizLandingPage THEME 과 동일). */
const QUIZ_DOTS = ["#ff8a3d", "#ff5e7e", "#3db8c4", "#c77dff", "#6d7be0"];

export function HomePage() {
  const [target] = useState(detectStoreTarget);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLElement>(null);
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);
  const [downloadVisible, setDownloadVisible] = useState(false);

  // 모바일 고정 설치 바: 히어로 CTA 가 화면 밖이고, 마무리 CTA 가 안 보일 때만 노출.
  useEffect(() => {
    if (target === "desktop" || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === heroCtaRef.current) setHeroCtaVisible(entry.isIntersecting);
        if (entry.target === downloadRef.current) setDownloadVisible(entry.isIntersecting);
      }
    });
    if (heroCtaRef.current) observer.observe(heroCtaRef.current);
    if (downloadRef.current) observer.observe(downloadRef.current);
    return () => observer.disconnect();
  }, [target]);

  const showStickyBar = target !== "desktop" && !heroCtaVisible && !downloadVisible;

  return (
    <div className={target === "desktop" ? "home" : "home home--mobile"}>
      <section className="hero">
        <PawTrail className="hero-trail" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow">강아지 · 고양이 보호자를 위한 무료 앱</span>
            <h1>
              우리 아이의 하루에
              <br />
              <mark className="hl">발도장</mark>을 찍어주세요
            </h1>
            <p className="lead">
              접종·진료 기록은 든든하게, 매일의 순간은 발도장으로. 잘 챙기고 있다는 걸 앱이 먼저 알아봐 줄게요.
            </p>
            <div ref={heroCtaRef}>
              <StoreBadges target={target} />
            </div>
            <ul className="trust-chips">
              <li><CheckMark />무료</li>
              <li><CheckMark />iOS · Android</li>
              <li><CheckMark />가족과 함께 기록</li>
            </ul>
          </div>
          <div className="hero-visual">
            <div className="hero-blob" aria-hidden="true" />
            <PhoneMockup />
            <span className="stamp-badge" aria-hidden="true">
              오늘도
              <br />
              발도장!
            </span>
          </div>
        </div>
      </section>

      <section className="container quiz-wrap">
        <Link to="/quiz" className="quiz-card">
          <span className="quiz-emoji" aria-hidden="true">🐶</span>
          <span className="quiz-text">
            <span className="quiz-label">30초 테스트</span>
            <span className="quiz-title">우리 아이는 어떤 성격일까?</span>
            <span className="quiz-sub">
              회원가입 없이 바로 결과 카드 받기
              <span className="quiz-dots" aria-hidden="true">
                {QUIZ_DOTS.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
            </span>
          </span>
          <span className="quiz-arrow" aria-hidden="true">→</span>
        </Link>
      </section>

      <section id="features" className="values container">
        <div className="values-head">
          <span className="section-eyebrow">발도장이 해주는 일</span>
          <h2>좋은 보호자라는 걸, 매일 확인하게</h2>
        </div>
        <div className="values-grid">
          {VALUES.map((v) => (
            <article key={v.title} className={`value-card value-card--${v.tone}`}>
              <div className="value-icon" aria-hidden="true">{v.icon}</div>
              <h3>{v.title}</h3>
              <p>{v.description}</p>
              <ul className="value-chips">
                {v.chips.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="memorial-band">
        <div className="container">
          <RainbowIcon className="memorial-ic" aria-hidden="true" />
          <span>무지개다리를 건넌 아이의 기록도, 따뜻하게 간직할 수 있어요.</span>
        </div>
      </section>

      <section id="download" ref={downloadRef} className="container">
        <div className="download-cta">
          <PawTrail className="download-trail" />
          <h2>오늘부터, 우리 아이 하루에 발도장 하나</h2>
          <p>기록은 든든하게, 매일은 뿌듯하게. 무료로 시작하세요.</p>
          <StoreBadges target={target} inverse />
          <Link to="/quiz" className="download-quiz-link">
            아직 고민된다면? 30초 성격 테스트 해보기 →
          </Link>
        </div>
      </section>

      <section id="policies" className="container">
        <div className="policies">
          <div className="policies-text">
            <strong>이용자 보호 정책</strong>
            <br />
            서비스 이용 전 개인정보가 어떻게 수집·이용되는지 확인하실 수 있습니다.
          </div>
          <div className="policies-links">
            <Link to="/privacy">개인정보처리방침 보기</Link>
          </div>
        </div>
      </section>

      {target !== "desktop" && (
        <div className={`sticky-install${showStickyBar ? " is-visible" : ""}`} aria-hidden={!showStickyBar}>
          <BrandPaw className="sticky-install-icon" size={40} />
          <span className="sticky-install-brand">
            <strong>발도장</strong>
            <span>무료</span>
          </span>
          <a
            className="sticky-install-btn"
            href={STORES[target].url}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={showStickyBar ? 0 : -1}
          >
            {STORES[target].label}
          </a>
        </div>
      )}
    </div>
  );
}

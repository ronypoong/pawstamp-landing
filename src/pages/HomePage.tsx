import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { PhoneMockup } from "../components/PhoneMockup";
import {
  AppleIcon,
  BellIcon,
  ChatIcon,
  GooglePlayIcon,
  HeartIcon,
  MedicalChartIcon,
  PawIcon,
  PinIcon,
  RainbowIcon,
  SparkleIcon,
  SyringeIcon,
  UsersIcon,
} from "../components/AppIcons";

const APP_STORE_URL = "https://apps.apple.com/kr/app/pawstamp/id6778623989";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.pawstamp.mobile";

/** 스토어 배지. iOS·Android 모두 출시되어 각각 App Store / Google Play 로 연결. */
function StoreBadges() {
  return (
    <div className="store-badges">
      <a
        className="store-badge"
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="App Store 에서 발도장 다운로드"
      >
        <AppleIcon className="store-badge-ic" />
        <span className="store-badge-text">
          <span className="store-badge-top">지금 다운로드</span>
          <span className="store-badge-name">App Store</span>
        </span>
      </a>
      <a
        className="store-badge"
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Google Play 에서 발도장 다운로드"
      >
        <GooglePlayIcon className="store-badge-ic" />
        <span className="store-badge-text">
          <span className="store-badge-top">지금 다운로드</span>
          <span className="store-badge-name">Google Play</span>
        </span>
      </a>
    </div>
  );
}

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: <SyringeIcon />,
    title: "예방접종 관리",
    description: "접종 이력과 필수 접종 현황을 한눈에 보고, 만료 예정일을 푸시 알림으로 미리 받아봅니다.",
  },
  {
    icon: <SparkleIcon />,
    title: "AI 자동 입력",
    description: "예방접종 증명서를 촬영하면 AI가 백신명·접종일·만료일을 자동으로 읽어 기록해 드립니다.",
  },
  {
    icon: <MedicalChartIcon />,
    title: "진료 기록 보관",
    description: "병원 방문 내역, 진단명, 처방약, 비용을 사진·문서와 함께 깔끔하게 보관합니다.",
  },
  {
    icon: <HeartIcon />,
    title: "AI 알러지 분석",
    description: "검사지 사진을 올리면 AI가 결과를 읽어 알러지 항목별로 정리해 드립니다.",
  },
  {
    icon: <PawIcon />,
    title: "오늘의 한 줄 · 발도장",
    description: "매일 한 줄 기록과 발도장으로 일상을 남기고, 이번 주 활동을 한눈에 돌아봅니다.",
  },
  {
    icon: <PinIcon />,
    title: "펫플레이스",
    description: "내 주변 반려동물 동반 가능한 카페·장소를 거리순으로 찾아볼 수 있습니다.",
  },
  {
    icon: <ChatIcon />,
    title: "보호자 커뮤니티",
    description: "자유게시판·일상 공유·접종 질문·건강 상담으로 보호자들과 정보를 나눕니다.",
  },
  {
    icon: <UsersIcon />,
    title: "공동 보호자",
    description: "가족과 한 마리의 기록을 공유하고 권한별로 함께 관리할 수 있습니다.",
  },
  {
    icon: <BellIcon />,
    title: "맞춤 알림",
    description: "접종 만료, AI 분석 완료, 다가오는 기념일, 커뮤니티 반응을 푸시로 받아봅니다.",
  },
  {
    icon: <RainbowIcon />,
    title: "추모 모드",
    description: "무지개다리를 건넌 아이의 기록을 따뜻하게 보관하고 함께한 날들을 기억합니다.",
  },
];

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-badge">iOS · Android 출시</span>
            <h1>
              반려동물 건강 기록을
              <br />한 곳에서 안전하게
            </h1>
            <p className="lead">
              발도장은 강아지와 고양이 보호자가 예방접종, 진료 기록, 알러지 검사 결과를 보관하고,
              만료 임박 일정을 알림으로 받아볼 수 있는 모바일 앱입니다.
            </p>
            <p className="sub">가족이 함께 한 마리의 기록을 공유할 수 있고, AI가 알러지 검사지·접종 증빙을 자동으로 정리해 줍니다.</p>
            <StoreBadges />
            <span className="cta-note">App Store · Google Play 출시 · 강아지·고양이 보호자를 위한 무료 건강 기록 앱</span>
          </div>
          <div className="hero-visual">
            <PhoneMockup />
          </div>
        </div>
      </section>

      <section id="about" className="about container">
        <span className="section-eyebrow">발도장이란?</span>
        <h2>흩어진 우리 아이 기록을, 한 곳에</h2>
        <p>
          발도장(PawStamp)은 반려동물 보호자가 흩어져 있던 건강 기록을 한 자리에 정리하기 위해 만든 모바일 앱입니다.
          동물병원에서 받은 종이 차트, 휴대전화 사진첩 속 접종 증명서, 가족 단톡방에 흩어진 진료 메모를 더 이상 찾아 헤맬 필요가 없습니다.
        </p>
        <p>
          입력은 직접 손으로도, 사진 한 장으로도 가능합니다. 예방접종 증명서를 촬영하면 AI가 백신명·접종일·만료일을 자동으로 읽어 기록해 주고,
          알러지 검사지 사진을 올리면 알러지 항목을 정리해 보여 드립니다. 만료일이 가까워지면 푸시 알림으로 미리 알려 드려 갱신을 놓치지 않게 도와 드립니다.
        </p>
        <p>
          건강 기록만이 아닙니다. <strong>오늘의 한 줄</strong>과 <strong>발도장</strong>으로 매일의 일상을 남기고, 이번 주에 무엇을 함께했는지 한눈에 돌아볼 수 있어요.
          생일과 가족이 된 날 같은 <strong>기념일</strong>은 D-day로 미리 챙겨 드립니다.
        </p>
        <p>
          앱 안에서 내 주변 반려동물 동반 장소를 찾는 <strong>펫플레이스</strong>, 같은 고민을 나누는 보호자 <strong>커뮤니티</strong>까지.
          <strong>공동 보호자</strong> 기능으로는 가족이 권한별로 한 마리의 기록을 함께 관리할 수 있습니다.
        </p>
        <div className="about-stats">
          <div className="about-stat">
            <strong>1곳</strong>
            <span>접종·진료·일상 기록을 한 앱에서</span>
          </div>
          <div className="about-stat">
            <strong>사진 1장</strong>
            <span>증명서 촬영으로 AI 자동 기록</span>
          </div>
          <div className="about-stat">
            <strong>가족 모두</strong>
            <span>권한별 공동 보호자 관리</span>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="container">
          <div className="features-head">
            <span className="section-eyebrow">주요 기능</span>
            <h2>건강 기록부터 일상·동네 산책까지</h2>
            <p className="features-sub">반려 생활에 필요한 기능을 발도장 하나에 담았습니다.</p>
          </div>
          <div className="features">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="feature">
                <div className="feature-icon" aria-hidden="true">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="download-cta">
          <h2>지금 발도장을 만나보세요</h2>
          <p>접종·진료·알러지 기록을 한 곳에. App Store에서 다운로드하세요. Android도 곧 만나요.</p>
          <StoreBadges />
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
    </>
  );
}

import { Link } from "react-router-dom";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: "💉",
    title: "예방접종 관리",
    description: "접종 이력과 만료 예정일을 자동으로 추적하고 푸시 알림으로 안내합니다.",
  },
  {
    icon: "🩺",
    title: "진료 기록 보관",
    description: "병원 방문 내역, 진단명, 처방약, 비용을 사진·문서와 함께 보관합니다.",
  },
  {
    icon: "🧪",
    title: "알러지 검사 분석",
    description: "검사지 사진을 올리면 AI가 결과를 분석해 알러지 항목별로 정리해 드립니다.",
  },
  {
    icon: "👥",
    title: "공동 보호자",
    description: "가족과 한 마리의 기록을 공유하고 권한별로 함께 관리할 수 있습니다.",
  },
  {
    icon: "💬",
    title: "보호자 커뮤니티",
    description: "같은 고민을 나누는 보호자들과 정보를 주고받을 수 있습니다.",
  },
  {
    icon: "🔔",
    title: "맞춤 알림",
    description: "접종 만료, 분석 완료, 커뮤니티 반응을 푸시로 받아볼 수 있습니다.",
  },
];

export function HomePage() {
  return (
    <>
      <section className="hero container">
        <h1>
          반려동물 건강 기록을
          <br />한 곳에서 안전하게
        </h1>
        <p className="lead">
          발도장은 강아지와 고양이 보호자가 예방접종, 진료 기록, 알러지 검사 결과를 보관하고,
          만료 임박 일정을 알림으로 받아볼 수 있는 모바일 앱입니다.
        </p>
        <p className="sub">가족이 함께 한 마리의 기록을 공유할 수 있고, AI가 알러지 검사지·접종 증빙을 자동으로 정리해 줍니다.</p>
        <span className="cta" aria-disabled="true" role="link">
          곧 출시 예정
        </span>
        <span className="cta-note">Google Play 출시 준비 중입니다.</span>
      </section>

      <section id="about" className="about container">
        <h2>발도장이란?</h2>
        <p>
          발도장(PawStamp)은 반려동물 보호자가 흩어져 있던 건강 기록을 한 자리에 정리하기 위해 만든 모바일 앱입니다.
          동물병원에서 받은 종이 차트, 휴대전화 사진첩 속 접종 증명서, 가족 단톡방에 흩어진 진료 메모를 더 이상 찾아 헤맬 필요가 없습니다.
        </p>
        <p>
          입력은 직접 손으로도, 사진 한 장으로도 가능합니다. 예방접종 증명서를 촬영하면 AI가 백신명·접종일·만료일을 자동으로 읽어 기록해 주고,
          알러지 검사지 사진을 올리면 알러지 항목을 정리해 보여 드립니다. 만료일이 가까워지면 푸시 알림으로 미리 알려 드려 갱신을 놓치지 않게 도와 드립니다.
        </p>
        <p>
          공동 보호자 기능으로 가족 구성원이 한 마리의 기록을 함께 관리할 수 있고, 같은 고민을 가진 보호자들과 커뮤니티에서 정보를 나눌 수 있습니다.
        </p>
      </section>

      <section id="features" className="container features">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="feature">
            <div className="feature-icon" aria-hidden="true">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
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

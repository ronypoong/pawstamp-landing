import { Link } from "react-router-dom";

const CONTACT_EMAIL = "pawstamp@rubi-on.com";
const BUSINESS_INFO = "상호 루비온 · 대표 홍석진 · 사업자등록번호 188-65-00750";

export function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-row">
        <div className="footer-company">
          <div>© {new Date().getFullYear()} 발도장. All rights reserved.</div>
          <div className="footer-business">{BUSINESS_INFO}</div>
          {/* 같은 회사 서비스라는 표시 — 루비온 홈으로 */}
          <a className="footer-by" href="https://rubi-on.com">
            <img src="/rubion-mark.png" width={16} height={16} alt="" />
            by RUBI-ON
          </a>
        </div>
        <div className="footer-links">
          <Link to="/partner">매장 제휴 신청 (무료)</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>문의: {CONTACT_EMAIL}</a>
          {/* 정적 페이지(public/guide.html) — SPA 라우트가 아니라 일반 링크로 연다. */}
          <a href="/guide">자주 묻는 질문</a>
          <Link to="/terms">이용약관</Link>
          <Link to="/privacy">개인정보처리방침</Link>
        </div>
      </div>
    </footer>
  );
}

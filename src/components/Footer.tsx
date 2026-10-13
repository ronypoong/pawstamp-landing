import { Link } from "react-router-dom";

const CONTACT_EMAIL = "support@rubi-on.com";

export function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-row">
        <div>© {new Date().getFullYear()} 발도장. All rights reserved.</div>
        <div className="footer-links">
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

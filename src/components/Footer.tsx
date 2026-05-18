import { Link } from "react-router-dom";

const CONTACT_EMAIL = "tjrwls883@gmail.com";

export function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-row">
        <div>© {new Date().getFullYear()} 발도장. All rights reserved.</div>
        <div className="footer-links">
          <a href={`mailto:${CONTACT_EMAIL}`}>문의: {CONTACT_EMAIL}</a>
          <Link to="/privacy">개인정보처리방침</Link>
        </div>
      </div>
    </footer>
  );
}

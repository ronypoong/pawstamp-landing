import { Link, NavLink, useLocation } from "react-router-dom";
import { BrandPaw } from "./BrandPaw";

interface NavItem {
  label: string;
  to: string;
  /** When true, link is treated as active only on exact path match. */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "소개", to: "/#about" },
  { label: "기능", to: "/#features" },
  { label: "공지사항", to: "/notice" },
  { label: "개인정보", to: "/privacy", exact: true },
  { label: "문의", to: "/feedback", exact: true },
];

export function Header() {
  const { pathname, hash } = useLocation();

  return (
    <header className="site-header">
      <div className="container site-nav">
        <Link className="brand" to="/" aria-label="발도장 홈">
          <BrandPaw className="brand-icon" />
          <span>발도장</span>
        </Link>
        <nav className="nav-links" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => {
            // 해시 링크(/#xxx)는 React Router의 NavLink active 매칭이 부정확하므로 일반 <a> 사용
            if (item.to.includes("#")) {
              const sectionHash = item.to.slice(item.to.indexOf("#"));
              const isActiveSection = pathname === "/" && hash === sectionHash;
              return (
                <a
                  key={item.to}
                  href={item.to}
                  className={isActiveSection ? "active" : undefined}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

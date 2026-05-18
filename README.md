# pawstamp-landing

발도장 앱 랜딩 페이지. Cloudflare Pages로 `pawstamp.rubi-on.com`에 배포됩니다.

## 스택
- Vite + React + TypeScript
- React Router (BrowserRouter)

## 구조
```
src/
├── main.tsx            # 진입점
├── App.tsx             # 라우트 정의
├── styles.css          # 전역 스타일
├── layouts/Layout.tsx  # Header + Outlet + Footer (모든 페이지 공용)
├── components/
│   ├── Header.tsx      # 통일된 nav: 소개 / 기능 / 개인정보처리방침 / 문의
│   └── Footer.tsx
└── pages/
    ├── HomePage.tsx
    └── PrivacyPage.tsx
public/
└── _redirects          # Cloudflare Pages SPA fallback (/* → /index.html 200)
```

## 개발
```bash
npm install
npm run dev      # 로컬 dev 서버
npm run build    # dist/ 산출
npm run preview  # 빌드 결과 미리보기
```

## 배포 (Cloudflare Pages)
- Build command: `npm run build`
- Build output: `dist`
- GitHub `main` 브랜치 push → 자동 배포

## 수정 시 주의
- 모든 페이지는 `Layout` 안에 들어가므로 nav/footer가 자동으로 동일하게 유지됩니다. 새 페이지 추가 시 `App.tsx` 라우트만 추가하면 됨.
- 정책 페이지 본문은 `pages/PrivacyPage.tsx` 안에 직접 작성. 변경 시 시행일/개정 이력도 함께 업데이트.
- 문의 이메일: `tjrwls883@gmail.com` (Footer.tsx 상수)

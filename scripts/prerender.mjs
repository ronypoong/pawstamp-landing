// 빌드 후 홈·진단·매장 제휴 페이지를 정적 HTML 로 미리 그린다(네이버 Yeti 등 JS 를 잘 못 읽는 검색 로봇용).
// 클라이언트는 main.tsx 가 createRoot 로 다시 그리므로 동작은 그대로다.
// index.html 은 다른 SPA 경로(/notice, /partner/login …)에도 쓰이므로, 그 경로에선 head 의 인라인 스크립트가
// 미리 그린 홈 내용을 숨기고 main.tsx 가 비운 뒤 그린다.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DIST = "dist";
const SSR = join("dist-ssr", "entry-server.js");
const SITE = "https://pawstamp.rubi-on.com";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const { render } = await import(pathToFileURL(SSR).href);

function inject(file, url) {
  const path = join(DIST, file);
  if (!existsSync(path)) return;
  const html = readFileSync(path, "utf8");
  if (!html.includes('<div id="root"></div>')) throw new Error(`${file}: 빈 root 가 없어요`);
  writeFileSync(path, html.replace('<div id="root"></div>', `<div id="root">${render(url)}</div>`));
  console.log(`[prerender] ${url} → ${file}`);
}

function writePartnerPage() {
  const title = "매장 제휴 신청 — 발도장 파트너(무료)";
  const desc = "애견카페·호텔·미용실 사장님용 무료 QR. 손님이 입구 QR을 찍으면 반려견 접종 기록(펫 패스)이 사장님 화면에 바로 도착하고, 방문 기록과 단골 현황이 저절로 쌓여요.";
  const url = `${SITE}/partner`;
  const html = readFileSync(join(DIST, "index.html"), "utf8")
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/<link rel="canonical"[^>]*>/, "")
    .replace("</head>", `<link rel="canonical" href="${url}" /></head>`);
  writeFileSync(join(DIST, "partner.html"), html);
}

// partner.html 은 아직 빈 root 인 index.html 에서 메타만 바꿔 만든 뒤 각각 그린다.
writePartnerPage();
inject("index.html", "/");
inject("check.html", "/check");
inject("partner.html", "/partner");
rmSync("dist-ssr", { recursive: true, force: true });

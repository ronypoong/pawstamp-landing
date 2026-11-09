// 블로그 정적 생성기 (npm run build 의 postbuild 로 실행).
// content/blog/*.md → dist/blog/{slug}/index.html, dist/blog/index.html, dist/blog/rss.xml, dist/sitemap.xml 병합.
// SPA(Vite)는 JS 없이는 내용이 비어 있어 검색 로봇(네이버 등)이 못 읽으므로, 블로그는 글마다 완성된 HTML 을 만든다.
// Cloudflare Pages 는 실제 파일이 _redirects 의 SPA 폴백(/* /index.html 200)보다 우선한다(/guide 와 같은 방식).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, openSync, readSync, closeSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content/blog");
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");
const SITE = "https://pawstamp.rubi-on.com";
const SITE_NAME = "발도장";
const BLOG_NAME = "발도장 블로그";
const DEFAULT_OG = "/blog/images/og-default.jpg";
const APP_STORE_URL = "https://apps.apple.com/kr/app/pawstamp/id6778623989";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.pawstamp.mobile";
const BUSINESS_INFO = "상호 루비온 · 대표 홍석진 · 사업자등록번호 188-65-00750";

// ─── 설정: 검색엔진 소유확인 meta (env 우선, 없으면 content/site.config.json, 비면 생략) ───
function loadConfig() {
  let file = {};
  const p = join(ROOT, "content/site.config.json");
  if (existsSync(p)) file = JSON.parse(readFileSync(p, "utf8"));
  return {
    naver: process.env.NAVER_SITE_VERIFICATION || file.naverSiteVerification || "",
    google: process.env.GOOGLE_SITE_VERIFICATION || file.googleSiteVerification || "",
  };
}
const CONFIG = loadConfig();

// ─── 작은 YAML(frontmatter) 파서: key: value / [a, b] / 리스트 / 리스트 안 객체(- q: / a:) ───
function scalar(v) {
  v = v.trim();
  if (v === "") return "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[") && v.endsWith("]")) {
    return v
      .slice(1, -1)
      .split(",")
      .map((x) => scalar(x))
      .filter((x) => x !== "");
  }
  return v;
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("frontmatter 가 없어요");
  const data = {};
  let listKey = null;
  let current = null;
  for (const raw of m[1].split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const top = raw.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (top) {
      const [, k, v] = top;
      if (v === "") {
        data[k] = [];
        listKey = k;
      } else {
        data[k] = scalar(v);
        listKey = null;
      }
      current = null;
      continue;
    }
    const item = raw.match(/^\s+-\s+(?:([A-Za-z]\w*):\s*)?(.*)$/);
    if (item && listKey) {
      if (item[1]) {
        current = { [item[1]]: scalar(item[2]) };
        data[listKey].push(current);
      } else {
        data[listKey].push(scalar(item[2]));
        current = null;
      }
      continue;
    }
    const sub = raw.match(/^\s+([A-Za-z]\w*):\s*(.*)$/);
    if (sub && current) current[sub[1]] = scalar(sub[2]);
  }
  return { data, body: m[2] };
}

// ─── 이미지 크기(JPEG/PNG) — width/height 속성으로 레이아웃 흔들림(CLS) 방지 ───
function imageSize(file) {
  const fd = openSync(file, "r");
  const buf = Buffer.alloc(256 * 1024);
  const n = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < n) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const abs = (p) => (p.startsWith("http") ? p : SITE + p);
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

function fmtDate(d) {
  const [y, m, day] = String(d).split("-");
  return `${y}년 ${Number(m)}월 ${Number(day)}일`;
}

// ─── 마크다운 렌더러 ───
function makeMarked() {
  let imgIndex = 0;
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      image({ href, title, text }) {
        const local = href.startsWith("/") ? join(PUBLIC, href) : null;
        const size = local && existsSync(local) ? imageSize(local) : null;
        const webp = local ? local.replace(/\.(jpe?g|png)$/i, ".webp") : null;
        const hasWebp = webp && webp !== local && existsSync(webp);
        const first = imgIndex++ === 0;
        const dims = size ? ` width="${size.w}" height="${size.h}"` : "";
        const img = `<img src="${esc(href)}" alt="${esc(text)}"${dims} loading="${first ? "eager" : "lazy"}" decoding="async">`;
        const pic = hasWebp ? `<picture><source type="image/webp" srcset="${esc(href.replace(/\.(jpe?g|png)$/i, ".webp"))}">${img}</picture>` : img;
        return `<figure>${pic}${title ? `<figcaption>${esc(title)}</figcaption>` : ""}</figure>`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href) && !href.startsWith(SITE);
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}${external ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        // 본문 h1 은 제목(h1) 하나만 두기 위해 h2 로 낮춘다
        const level = Math.max(2, depth);
        const id = inner.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "");
        return `<h${level} id="${esc(id)}">${inner}</h${level}>`;
      },
    },
  });
  return marked;
}

// ─── 공통 마크업 ───
const SEAL_SVG = `<svg width="28" height="28" viewBox="18 18 64 64" aria-hidden="true"><g transform="rotate(3 50 50)"><rect x="20" y="20" width="60" height="60" rx="9" fill="#c4563c"/><g fill="#fbf6ee" transform="translate(50 54.2) scale(0.465)"><ellipse cx="-27" cy="-14" rx="9" ry="12" transform="rotate(-24 -27 -14)"/><ellipse cx="-10" cy="-33" rx="10" ry="13" transform="rotate(-8 -10 -33)"/><ellipse cx="10" cy="-33" rx="10" ry="13" transform="rotate(8 10 -33)"/><ellipse cx="27" cy="-14" rx="9" ry="12" transform="rotate(24 27 -14)"/><path d="M0-8C13-8 29 8 29 19C29 29 21 33 12 31C6 30 3 28 0 28C-3 28-6 30-12 31C-21 33-29 29-29 19C-29 8-13-8 0-8Z"/></g></g></svg>`;

const CSS = `
:root{--bg:#fbf4ee;--surface:#fffcf9;--alt:#f8f0e8;--text:#2e2823;--muted:#5a5049;--subtle:#8b8079;--border:#e6dace;--line:#f0e8df;--ink:#2e2823;--seal:#c4563c;--seal-ink:#a8432b;--seal-soft:#f9e7e0;--green:#15803d}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif;line-height:1.75;word-break:keep-all;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased}
a{color:var(--seal-ink)}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
.hd{position:sticky;top:0;z-index:10;background:rgba(255,252,249,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)}
.hd .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px}
.brand{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:var(--text);text-decoration:none}
.nav{display:flex;gap:4px;align-items:center;font-size:14px}
.nav a{color:var(--muted);text-decoration:none;padding:0 10px;border-radius:999px;min-height:44px;display:inline-flex;align-items:center}
.nav a.on{color:var(--text);font-weight:700}
.nav a.cta{background:var(--ink);color:#fff;font-weight:700;padding:0 14px}
main{padding:28px 0 56px}
.crumb{font-size:13px;color:var(--muted);margin:0 0 10px}
.crumb a{color:var(--muted);text-decoration:none}
h1{font-size:28px;line-height:1.35;letter-spacing:-.02em;margin:0 0 12px}
.meta{font-size:14px;color:var(--muted);margin:0 0 20px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 20px;padding:0;list-style:none}
.tags li{font-size:13px;font-weight:600;color:var(--muted);padding:0}.tags li+li::before{content:"·";margin-right:6px}
.cover{margin:0 0 28px;border-radius:18px;overflow:hidden;background:var(--alt)}
.cover img{display:block;width:100%;height:auto}
article h2{font-size:22px;line-height:1.4;margin:40px 0 12px;padding-top:4px}
article h3{font-size:18px;margin:28px 0 8px}
article p,article li{font-size:17px}
article ul,article ol{padding-left:22px}
article li{margin:4px 0}
article blockquote{margin:20px 0;padding:14px 18px;border-left:4px solid var(--seal);background:var(--surface);border-radius:0 12px 12px 0;color:var(--muted)}
article blockquote p{margin:0}
article figure{margin:24px 0}
article figure img{display:block;width:100%;height:auto;border-radius:14px;background:var(--alt)}
article figcaption{font-size:14px;color:var(--muted);margin-top:6px;text-align:center}
.table-wrap{overflow-x:auto;margin:16px 0;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:0;font-size:15px}
td:nth-child(2){white-space:nowrap}th,td{padding:10px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{background:var(--alt);font-weight:800;white-space:nowrap}
tr:last-child td{border-bottom:0}
li:has(>input[type=checkbox]){list-style:none;margin:8px 0 8px -22px;position:relative;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 14px 10px 42px}
input[type=checkbox]{position:absolute;left:14px;top:calc(10px + .42em);margin:0;width:18px;height:18px;appearance:none;-webkit-appearance:none;border:1.5px solid var(--subtle);border-radius:5px;background:var(--surface);opacity:1}
.faq{margin:44px 0 0}
.faq h2{margin-top:0}
.faq details{border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:0 16px;margin:8px 0}
.faq summary{cursor:pointer;font-weight:700;font-size:17px;list-style:none;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0}.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+";font-size:22px;color:var(--subtle);flex:none}.faq details[open] summary::after{content:"−"}
.faq details p{margin:0 0 14px;color:var(--muted)}
.notice{margin:28px 0 0;padding:14px 16px;border-radius:14px;background:var(--alt);font-size:14px;color:var(--muted)}
.cta-box{margin:44px 0 0;padding:24px 20px;border-radius:20px;background:var(--alt);border:0;text-align:center}
.cta-box h2{margin:8px 0 6px;font-size:20px}
.cta-box p{margin:0 0 16px;color:var(--muted);font-size:15px}
.stores{display:flex;flex-direction:column;align-items:stretch;gap:8px;max-width:280px;margin:0 auto}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 20px;border-radius:14px;font-weight:700;font-size:16px;text-decoration:none;border:1px solid var(--border);background:var(--surface);color:var(--text)}
.btn.primary{background:var(--ink);border-color:var(--ink);color:#fff}
.related{margin:44px 0 0}
.related h2{font-size:20px;margin:0 0 12px}
.cards{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.card a{display:flex;gap:14px;align-items:center;padding:12px;border-radius:16px;background:var(--surface);border:1px solid var(--line);text-decoration:none;color:var(--text)}
.card img{flex:none;width:96px;height:50px;object-fit:cover;object-position:left center;border-radius:10px;background:var(--alt)}
.card b{font-size:15px;line-height:1.45;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
.card span{font-size:13px;color:var(--muted)}
.list-hero{padding:8px 0 20px}
.list-hero p{color:var(--muted);margin:0}
.posts{list-style:none;margin:0;padding:0;display:grid;gap:16px}
.post a{display:block;border-radius:20px;overflow:hidden;background:var(--surface);border:1px solid var(--line);text-decoration:none;color:var(--text)}
.post img{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover;background:var(--alt)}
.post .pb{padding:18px 20px 20px}
.post h2{font-size:19px;line-height:1.45;margin:0 0 6px}
.post p{margin:0;color:var(--muted);font-size:15px}
.post time{display:block;margin-top:8px;font-size:13px;color:var(--subtle)}
.ft{border-top:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:14px;padding:28px 0}
.ft a{color:var(--muted);display:inline-block;padding:10px 0;margin-right:16px}
.ft p{margin:4px 0}
@media (min-width:720px){h1{font-size:34px}.posts{grid-template-columns:1fr 1fr}.cards{grid-template-columns:1fr}}
`.replace(/\n/g, "");

function head({ title, description, canonical, image, type, extra = "" }) {
  const verify = [
    CONFIG.naver ? `<meta name="naver-site-verification" content="${esc(CONFIG.naver)}">` : "",
    CONFIG.google ? `<meta name="google-site-verification" content="${esc(CONFIG.google)}">` : "",
  ].join("");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index,follow,max-image-preview:large">
${verify}<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(abs(image))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs(image))}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${BLOG_NAME}" href="${SITE}/blog/rss.xml">
<meta name="theme-color" content="#fbf4ee">
<style>${CSS}</style>
${extra}
</head>`;
}

function header(active) {
  return `<header class="hd"><div class="wrap"><a class="brand" href="/" aria-label="발도장 홈">${SEAL_SVG}<span>발도장</span></a><nav class="nav" aria-label="주요 메뉴"><a href="/">홈</a><a href="/blog/"${active ? ' class="on" aria-current="page"' : ""}>블로그</a><a class="cta" href="/#download">앱 받기</a></nav></div></header>`;
}

function footer() {
  return `<footer class="ft"><div class="wrap"><p>© ${new Date().getFullYear()} 발도장. All rights reserved.</p><p>${BUSINESS_INFO}</p><p><a href="/blog/">블로그</a><a href="/guide">자주 묻는 질문</a><a href="/terms">이용약관</a><a href="/privacy">개인정보처리방침</a><a href="mailto:pawstamp@rubi-on.com">문의</a></p></div></footer>`;
}

// 앱 설치 CTA: JS 없으면 두 스토어 버튼, JS 있으면 기기에 맞는 버튼을 앞으로·강조.
function storeCta() {
  return `<section class="cta-box" aria-labelledby="cta-title">${SEAL_SVG.replace('width="28" height="28"', 'width="40" height="40"')}
<h2 id="cta-title">접종 기록·외출 준비, 발도장 하나로</h2>
<p>접종 일정 알림부터 외출할 때 보여주는 펫 패스까지, 무료로 시작해요.</p>
<div class="stores" id="stores"><a class="btn primary" data-os="ios" href="${APP_STORE_URL}">App Store에서 받기</a><a class="btn" data-os="android" href="${GOOGLE_PLAY_URL}">Google Play에서 받기</a></div>
</section>
<script>(function(){var u=navigator.userAgent||"",os=/android/i.test(u)?"android":(/iphone|ipad|ipod/i.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1))?"ios":"";if(!os)return;var b=document.getElementById("stores");if(!b)return;var a=b.querySelectorAll("a");for(var i=0;i<a.length;i++){var m=a[i].getAttribute("data-os")===os;a[i].className=m?"btn primary":"btn";if(m)b.insertBefore(a[i],b.firstChild);}})();</script>`;
}

// ─── 생성 ───
function loadPosts() {
  const files = readdirSync(CONTENT).filter((f) => f.endsWith(".md"));
  const posts = files.map((f) => {
    const { data, body } = parseFrontmatter(readFileSync(join(CONTENT, f), "utf8"));
    for (const k of ["title", "description", "slug", "date"]) if (!data[k]) throw new Error(`${f}: ${k} 가 필요해요`);
    if (String(data.description).length > 120) console.warn(`[blog] ${f}: description 이 120자를 넘어요`);
    if (!/^[a-z0-9-]+$/.test(data.slug)) throw new Error(`${f}: slug 는 영문 소문자·숫자·하이픈만`);
    return { ...data, updated: data.updated || data.date, tags: data.tags || [], faq: data.faq || [], body, file: f };
  });
  return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function related(post, posts) {
  return posts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: p.tags.filter((t) => post.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score || String(b.p.date).localeCompare(String(a.p.date)))
    .slice(0, 3)
    .map((x) => x.p);
}

function renderPost(post, posts) {
  const url = `${SITE}/blog/${post.slug}/`;
  const image = post.cover || DEFAULT_OG;
  const marked = makeMarked();
  // 표는 모바일 가로 스크롤을 위해 감싼다
  const html = String(marked.parse(post.body)).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  const title = `${post.title} | ${BLOG_NAME}`;
  const coverSize = existsSync(join(PUBLIC, image)) ? imageSize(join(PUBLIC, image)) : null;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: [abs(image)],
      datePublished: post.date,
      dateModified: post.updated,
      inLanguage: "ko-KR",
      mainEntityOfPage: url,
      url,
      keywords: post.tags.join(", "),
      author: { "@type": "Organization", name: SITE_NAME, url: SITE },
      publisher: { "@type": "Organization", name: "루비온(발도장)", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/favicon.svg` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "블로그", item: `${SITE}/blog/` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faq.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }

  const faqHtml = post.faq.length
    ? `<section class="faq" aria-labelledby="faq-title"><h2 id="faq-title">자주 묻는 질문</h2>${post.faq
        .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
        .join("")}</section>`
    : "";
  const notice = post.petPass
    ? `<p class="notice">발도장 펫 패스는 보호자가 앱에 기록한 정보를 보여주는 확인 보조 도구로, 공식 증명서를 대신하지 않아요.</p>`
    : "";
  const rel = related(post, posts);
  const relHtml = rel.length
    ? `<section class="related" aria-labelledby="rel-title"><h2 id="rel-title">함께 읽으면 좋은 글</h2><ul class="cards">${rel
        .map(
          (p) =>
            `<li class="card"><a href="/blog/${p.slug}/"><img src="${esc(p.cover || DEFAULT_OG)}" alt="" width="96" height="50" loading="lazy" decoding="async"><span><b>${esc(p.title)}</b><span>${fmtDate(p.date)}</span></span></a></li>`,
        )
        .join("")}</ul></section>`
    : "";

  return `${head({ title, description: post.description, canonical: url, image, type: "article", extra: `<meta property="article:published_time" content="${post.date}">\n<meta property="article:modified_time" content="${post.updated}">\n${ld.map(jsonLd).join("\n")}` })}
<body>
${header(true)}
<main class="wrap">
<nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> › <a href="/blog/">블로그</a></nav>
<article>
<h1>${esc(post.title)}</h1>
<p class="meta"><time datetime="${post.date}">${fmtDate(post.date)}</time>${post.updated !== post.date ? ` · 수정 <time datetime="${post.updated}">${fmtDate(post.updated)}</time>` : ""} · ${SITE_NAME}</p>
${post.tags.length ? `<ul class="tags">${post.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
${post.cover && post.showCover !== false ? `<figure class="cover"><img src="${esc(post.cover)}" alt="${esc(post.coverAlt || post.title)}"${coverSize ? ` width="${coverSize.w}" height="${coverSize.h}"` : ""} fetchpriority="high"></figure>` : ""}
${html}
${faqHtml}
${notice}
</article>
${storeCta()}
${relHtml}
</main>
${footer()}
</body>
</html>
`;
}

function renderIndex(posts) {
  const url = `${SITE}/blog/`;
  const description = "반려견 예방접종, 동반 외출 준비, 주인장이 직접 다녀온 나들이 장소까지. 발도장이 보호자에게 꼭 필요한 정보를 쉽게 정리해요.";
  const ld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: BLOG_NAME,
    url,
    inLanguage: "ko-KR",
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}/`, datePublished: p.date })),
  };
  return `${head({ title: `${BLOG_NAME} — 반려견 접종·외출·나들이 정보`, description, canonical: url, image: DEFAULT_OG, type: "website", extra: jsonLd(ld) })}
<body>
${header(true)}
<main class="wrap">
<section class="list-hero"><h1>${BLOG_NAME}</h1><p>${esc(description)}</p></section>
<ul class="posts">
${posts
  .map(
    (p, i) =>
      `<li class="post"><a href="/blog/${p.slug}/">${p.cover && p.showCover !== false ? `<img src="${esc(p.cover)}" alt="" width="1200" height="630" loading="${i < 2 ? "eager" : "lazy"}" decoding="async">` : ""}<div class="pb"><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><time datetime="${p.date}">${fmtDate(p.date)}</time></div></a></li>`,
  )
  .join("\n")}
</ul>
${storeCta()}
</main>
${footer()}
</body>
</html>
`;
}

function renderRss(posts) {
  const items = posts
    .map(
      (p) => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}/</link><guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid><description>${esc(p.description)}</description><pubDate>${new Date(`${p.date}T09:00:00+09:00`).toUTCString()}</pubDate></item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${BLOG_NAME}</title>
<link>${SITE}/blog/</link>
<description>반려견 접종·외출·나들이 정보</description>
<language>ko</language>
<atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
}

function mergeSitemap(posts) {
  const path = join(DIST, "sitemap.xml");
  let xml = existsSync(path)
    ? readFileSync(path, "utf8")
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;
  // 기존 블로그 항목 제거 후 다시 추가(재실행해도 중복 없음)
  xml = xml.replace(/\s*<url><loc>[^<]*\/blog\/[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
  const latest = posts.reduce((m, p) => (String(p.updated) > m ? String(p.updated) : m), "");
  const entries = [
    `  <url><loc>${SITE}/blog/</loc><lastmod>${latest}</lastmod><priority>0.8</priority></url>`,
    ...posts.map((p) => `  <url><loc>${SITE}/blog/${p.slug}/</loc><lastmod>${p.updated}</lastmod><priority>0.7</priority></url>`),
  ].join("\n");
  xml = xml.replace("</urlset>", `${entries}\n</urlset>`);
  writeFileSync(path, xml);
}

/** SPA index.html 에도 소유확인 meta 를 넣는다(값이 있을 때만). */
function injectVerification() {
  const p = join(DIST, "index.html");
  if (!existsSync(p) || (!CONFIG.naver && !CONFIG.google)) return;
  let html = readFileSync(p, "utf8");
  const metas = [
    CONFIG.naver && !html.includes("naver-site-verification") ? `<meta name="naver-site-verification" content="${esc(CONFIG.naver)}" />` : "",
    CONFIG.google && !html.includes("google-site-verification") ? `<meta name="google-site-verification" content="${esc(CONFIG.google)}" />` : "",
  ].join("");
  if (metas) writeFileSync(p, html.replace("</head>", `${metas}</head>`));
}

function main() {
  if (!existsSync(DIST)) throw new Error("dist 가 없어요. vite build 뒤에 실행해 주세요.");
  const posts = loadPosts();
  for (const post of posts) {
    const out = join(DIST, "blog", post.slug, "index.html");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderPost(post, posts));
  }
  writeFileSync(join(DIST, "blog", "index.html"), renderIndex(posts));
  writeFileSync(join(DIST, "blog", "rss.xml"), renderRss(posts));
  mergeSitemap(posts);
  injectVerification();
  console.log(`[blog] ${posts.length}개 글 생성: ${posts.map((p) => `/blog/${p.slug}/`).join(", ")}`);
}

main();

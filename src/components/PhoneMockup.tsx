import { useEffect, useState } from "react";

import {
  BellIcon,
  CalendarIcon,
  ChatIcon,
  ChevronIcon,
  ClockIcon,
  EditIcon,
  HeartIcon,
  HomeIcon,
  MedicalChartIcon,
  MessageIcon,
  PawIcon,
  PinIcon,
  SyringeIcon,
  UserIcon,
} from "./AppIcons";

/**
 * 발도장 앱의 5개 탭 화면(홈/펫플레이스/기록/커뮤니티/마이)을 더미 데이터로
 * 충실히 재현하고, 몇 초마다 자동으로 전환되는 인터랙티브 목업.
 * 레이아웃·아이콘·탭은 pawstamp-fe 의 실제 화면 컴포넌트를 그대로 따랐다.
 * (Dashboard / OutingScreen / VaccinationHistory / CommunityScreen / MyPageScreen)
 */

const ROTATE_MS = 3200;

const TABS = [
  { label: "홈", icon: HomeIcon },
  { label: "펫플레이스", icon: PinIcon },
  { label: "기록", icon: ClockIcon },
  { label: "커뮤니티", icon: ChatIcon },
  { label: "마이", icon: UserIcon },
];

export function PhoneMockup() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // 모션 최소화 설정이면 자동 전환을 끈다.
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % TABS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const screens = [<HomeScreen />, <PlaceScreen />, <RecordScreen />, <CommunityScreen />, <MyScreen />];

  return (
    <div
      className="pm"
      role="group"
      aria-label="발도장 앱 화면 미리보기"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pm-frame">
        <div className="pm-notch" aria-hidden="true" />
        <div className="pm-statusbar" aria-hidden="true">
          <span>9:41</span>
          <span className="pm-statusbar-ic">●●● ▾ ▮</span>
        </div>

        <div className="pm-viewport">
          {screens.map((screen, i) => (
            <div
              key={i}
              className={i === active ? "pm-scr pm-scr-active" : "pm-scr"}
              aria-hidden={i !== active}
            >
              {screen}
            </div>
          ))}
        </div>

        <div className="pm-nav">
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${tab.label} 화면 보기`}
                className={i === active ? "pm-nav-item pm-nav-active" : "pm-nav-item"}
              >
                <span className="pm-nav-ic"><Icon /></span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pm-dots" aria-hidden="true">
        {TABS.map((_, i) => (
          <span key={i} className={i === active ? "pm-dot-on" : "pm-dot"} />
        ))}
      </div>
    </div>
  );
}

/* ─────────── 홈 ─────────── */
const WEEK = [
  { d: "월", tone: "#0ea5e9" },
  { d: "화", tone: "#f59e0b" },
  { d: "수", tone: "#22c55e" },
  { d: "목", tone: "#ec4899" },
  { d: "금", tone: "#8b5cf6" },
  { d: "토", tone: null },
  { d: "오늘", tone: "#ec4899", today: true },
];

function HomeScreen() {
  return (
    <div className="pm-page">
      <div className="pm-profile">
        <span className="pm-avatar" aria-hidden="true">🐶</span>
        <div className="pm-profile-info">
          <div className="pm-profile-name">
            <span>콩이</span>
            <ChevronIcon className="pm-chevron" />
          </div>
          <p className="pm-profile-sub">남아 · 말티즈 · 3살 2개월</p>
          <p className="pm-together-label">함께한지</p>
          <p className="pm-together-days">1,184일</p>
        </div>
      </div>

      <div className="pm-daterow">
        <div className="pm-datecell">
          <span className="pm-datecell-label"><PinIcon className="pm-mini-ic" />가족이 된 날</span>
          <span className="pm-datecell-value">2022.04.18</span>
        </div>
        <div className="pm-datecell">
          <span className="pm-datecell-label"><CalendarIcon className="pm-mini-ic" />생일</span>
          <span className="pm-datecell-value">2022.01.30</span>
        </div>
      </div>

      <div className="pm-stats">
        <Stat icon={<SyringeIcon />} color="#0284c7" count={12} label="접종" />
        <Stat icon={<MedicalChartIcon />} color="#7c3aed" count={5} label="진료" />
        <Stat icon={<MessageIcon />} color="#f59e0b" count={8} label="메모" />
        <Stat icon={<EditIcon />} color="#16a34a" count={23} label="한 줄" />
      </div>

      <div className="pm-block">
        <div className="pm-block-title">
          <EditIcon className="pm-block-ic" style={{ color: "#16a34a" }} />
          오늘의 한 줄
        </div>
        <div className="pm-input">오늘 콩이가 보여준 사랑스러운 순간은?</div>
      </div>

      <div className="pm-block">
        <div className="pm-block-title">이번 주 발도장</div>
        <div className="pm-week">
          {WEEK.map((w) => (
            <div key={w.d} className="pm-day">
              <span className="pm-paw" style={w.tone ? { background: w.tone, color: "#fff" } : undefined}>
                <PawIcon className="pm-paw-ic" />
              </span>
              <span className={w.today ? "pm-day-label pm-today" : "pm-day-label"}>{w.d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pm-anniv">
        <div>
          <p className="pm-anniv-label">다가오는 기념일</p>
          <p className="pm-anniv-title">4번째 생일</p>
        </div>
        <span className="pm-dday">D-12</span>
      </div>
    </div>
  );
}

/* ─────────── 펫플레이스 ─────────── */
const PLACE_CATS = ["전체", "카페", "식당", "캠핑장", "공원"];
const PLACES = [
  { emoji: "☕", bg: "linear-gradient(135deg,#fde68a,#fbbf24)", name: "멍멍카페 연남점", dist: "0.4km", cat: "카페", addr: "서울 마포구 연남로 23" },
  { emoji: "🍴", bg: "linear-gradient(135deg,#bbf7d0,#34d399)", name: "댕댕식당", dist: "1.2km", cat: "식당", addr: "서울 마포구 양화로 12" },
  { emoji: "🌳", bg: "linear-gradient(135deg,#a7f3d0,#22c55e)", name: "한강 반려견 놀이터", dist: "2.1km", cat: "공원", addr: "서울 영등포구 여의동로" },
];

function PlaceScreen() {
  return (
    <div className="pm-page">
      <div className="pm-search">가게 이름이나 지역으로 검색</div>
      <div className="pm-radius">
        <span className="pm-radius-label">반경</span>
        <div className="pm-radius-track"><span className="pm-radius-fill" /><span className="pm-radius-thumb" /></div>
        <span className="pm-radius-val">5km</span>
      </div>
      <div className="pm-chips">
        {PLACE_CATS.map((c, i) => (
          <span key={c} className={i === 0 ? "pm-chip pm-chip-on" : "pm-chip"}>{c}</span>
        ))}
      </div>
      <div className="pm-places">
        {PLACES.map((p) => (
          <div key={p.name} className="pm-place">
            <span className="pm-place-thumb" style={{ background: p.bg }} aria-hidden="true">{p.emoji}</span>
            <div className="pm-place-info">
              <div className="pm-place-top">
                <span className="pm-place-name">{p.name}</span>
                <span className="pm-place-dist">{p.dist}</span>
              </div>
              <span className="pm-place-cat">{p.cat}</span>
              <span className="pm-place-addr">{p.addr}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 기록 ─────────── */
const REC_FILTERS = ["전체", "접종", "진료", "알러지", "메모", "한 줄"];
const RECORDS = [
  { day: "18", wd: "월", icon: <SyringeIcon />, color: "#0284c7", bg: "#e0f2fe", title: "종합백신 5차", sub: "행복동물병원" },
  { day: "12", wd: "화", icon: <MedicalChartIcon />, color: "#7c3aed", bg: "#ede9fe", title: "피부 진료", sub: "미래동물병원 · 처방 2종" },
  { day: "05", wd: "금", icon: <EditIcon />, color: "#16a34a", bg: "#dcfce7", title: "오늘의 한 줄", sub: "산책하다 낙엽에 폴짝 뛰었다 🍂" },
  { day: "02", wd: "화", icon: <MessageIcon />, color: "#d97706", bg: "#fef3c7", title: "건강 메모", sub: "사료 바꾼 뒤로 잘 먹어요" },
];

function RecordScreen() {
  return (
    <div className="pm-page">
      <div className="pm-chips">
        {REC_FILTERS.map((c, i) => (
          <span key={c} className={i === 0 ? "pm-chip pm-chip-on" : "pm-chip"}>{c}</span>
        ))}
      </div>
      <div className="pm-timeline">
        {RECORDS.map((r) => (
          <div key={r.day} className="pm-tl-row">
            <div className="pm-tl-date">
              <span className="pm-tl-day">{r.day}</span>
              <span className="pm-tl-wd">{r.wd}</span>
            </div>
            <div className="pm-tl-dot" />
            <div className="pm-rec">
              <span className="pm-rec-ic" style={{ color: r.color, background: r.bg }}>{r.icon}</span>
              <div className="pm-rec-info">
                <span className="pm-rec-title">{r.title}</span>
                <span className="pm-rec-sub">{r.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 커뮤니티 ─────────── */
const COMM_FILTERS = ["전체", "자유게시판", "일상 공유", "접종 질문", "건강 상담"];
const POSTS = [
  { emoji: "🐩", bg: "linear-gradient(135deg,#fbcfe8,#f472b6)", name: "초코", breed: "토이푸들", time: "3시간 전", cat: "일상 공유", title: "오늘 첫 미용했어요 ✂️", body: "너무 떨었는데 끝나니까 신나서 방방 뛰네요 ㅎㅎ", likes: 24, comments: 8 },
  { emoji: "🐱", bg: "linear-gradient(135deg,#bfdbfe,#60a5fa)", name: "나비", breed: "코숏", time: "어제", cat: "접종 질문", title: "5차 접종 시기 질문이요!", body: "4차 맞은 지 한 달 됐는데 언제쯤...", likes: 12, comments: 15 },
];

function CommunityScreen() {
  return (
    <div className="pm-page">
      <div className="pm-chips">
        {COMM_FILTERS.map((c, i) => (
          <span key={c} className={i === 0 ? "pm-chip pm-chip-on" : "pm-chip"}>{c}</span>
        ))}
      </div>
      <div className="pm-posts">
        {POSTS.map((p) => (
          <div key={p.title} className="pm-post">
            <div className="pm-post-head">
              <span className="pm-post-av" style={{ background: p.bg }} aria-hidden="true">{p.emoji}</span>
              <div className="pm-post-meta">
                <span className="pm-post-name">{p.name}</span>
                <span className="pm-post-info">{p.breed} · {p.time}</span>
              </div>
            </div>
            <span className="pm-post-cat">{p.cat}</span>
            <p className="pm-post-title">{p.title}</p>
            <p className="pm-post-body">{p.body}</p>
            <div className="pm-post-foot">
              <span className="pm-post-stat"><HeartIcon className="pm-post-ic" />{p.likes}</span>
              <span className="pm-post-stat"><MessageIcon className="pm-post-ic" />{p.comments}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 마이 ─────────── */
function MyScreen() {
  return (
    <div className="pm-page">
      <div className="pm-my-top"><BellIcon className="pm-my-bell" /></div>
      <div className="pm-profile">
        <span className="pm-avatar pm-avatar-edit" aria-hidden="true">
          🐶
          <span className="pm-edit-badge"><EditIcon /></span>
        </span>
        <div className="pm-profile-info">
          <div className="pm-profile-name">
            <span>콩이</span>
            <ChevronIcon className="pm-chevron" />
          </div>
          <p className="pm-profile-sub">남아 · 말티즈</p>
          <p className="pm-together-label">함께한지</p>
          <p className="pm-together-days">1,184일</p>
        </div>
      </div>

      <div className="pm-stats">
        <Stat icon={<EditIcon />} color="#16a34a" count={23} label="내 글" />
        <Stat icon={<MessageIcon />} color="#f59e0b" count={41} label="댓글" />
        <Stat icon={<HeartIcon />} color="#f43f5e" count={88} label="좋아요" />
        <Stat icon={<PawIcon />} color="#ec4899" count={156} label="발도장" />
      </div>

      <div className="pm-block">
        <div className="pm-block-title">커뮤니티 활동</div>
        <div className="pm-menu">
          <MyRow icon={<EditIcon />} label="내가 쓴 글" />
          <MyRow icon={<MessageIcon />} label="내가 쓴 댓글" />
          <MyRow icon={<HeartIcon />} label="좋아요한 글" />
        </div>
      </div>
    </div>
  );
}

function MyRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="pm-myrow">
      <span className="pm-myrow-ic">{icon}</span>
      <span className="pm-myrow-label">{label}</span>
      <ChevronIcon className="pm-myrow-chev" />
    </div>
  );
}

/* ─────────── 공통 ─────────── */
function Stat({ icon, color, count, label }: { icon: React.ReactNode; color: string; count: number; label: string }) {
  return (
    <div className="pm-stat">
      <span className="pm-stat-ic" style={{ color }}>{icon}</span>
      <span className="pm-stat-count">{count}</span>
      <span className="pm-stat-label">{label}</span>
    </div>
  );
}

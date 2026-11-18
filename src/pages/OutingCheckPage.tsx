import { useEffect, useMemo, useState } from "react";
import { APP_STORE_URL, GOOGLE_PLAY_URL, detectStoreTarget } from "../lib/storeTarget";

/**
 * 외출 준비도 진단(/check). 성격테스트를 대체하는 웹 전용 진단 — 서버 저장 없이 브라우저에서 바로 채점한다.
 * 문항의 법·제도 내용은 블로그(접종 확인 의무화·동물보호법 글)에서 원문 확인한 것만 쓴다. 과태료 금액은 원문 대조 전이라 적지 않는다.
 */

type Category = "docs" | "gear" | "behavior";

interface Option {
  label: string;
  score: 0 | 1 | 2;
  /** 결과의 할 일 카드 제목(동사로 시작). */
  action?: string;
  tip?: string;
}

interface Question {
  id: string;
  category: Category;
  title: string;
  /** 결과 리포트에서 이 항목을 부르는 짧은 이름. */
  item: string;
  /** 질문 아래 '왜 묻는지' 한 줄. */
  why: string;
  options: Option[];
}

const VAX_TIP =
  "2026년 3월부터 반려동물 동반 식당·카페는 손님 반려견의 접종 여부를 확인해야 해요. 입구에서 바로 보여줄 수 있게 폰에 준비해 두세요.";

const QUESTIONS: Question[] = [
  {
    id: "register",
    category: "docs",
    title: "동물등록, 되어 있나요?",
    item: "동물등록",
    why: "잃어버렸을 때 연락이 닿는지가 핵심이에요.",
    options: [
      { label: "했고, 연락처도 지금 번호예요", score: 2 },
      {
        label: "했는데 연락처가 예전 거예요",
        score: 1,
        action: "등록 연락처 변경 신고하기",
        tip: "이사하거나 번호가 바뀌면 변경 신고를 해야 해요. 잃어버렸을 때 연락이 닿는 게 등록의 핵심이에요.",
      },
      {
        label: "아직 안 했어요 / 잘 모르겠어요",
        score: 0,
        action: "동물병원에서 동물등록하기",
        tip: "반려견 동물등록은 의무예요. 가까운 동물병원 등 등록대행기관에서 할 수 있어요.",
      },
    ],
  },
  {
    id: "tag",
    category: "docs",
    title: "산책 나갈 때 인식표를 달고 나가나요?",
    item: "인식표",
    why: "등록칩은 스캐너가 있어야 읽혀요. 인식표는 누구나 바로 봐요.",
    options: [
      { label: "항상 달아요 (보호자 연락처 적힌 것)", score: 2 },
      { label: "가끔 빼먹어요", score: 1, action: "인식표를 목줄에 달아 두기", tip: "외출할 땐 동물등록을 했어도 보호자 연락처가 적힌 인식표를 달아야 해요." },
      { label: "인식표가 없어요", score: 0, action: "연락처 적힌 인식표 만들기", tip: "외출할 땐 동물등록을 했어도 보호자 연락처가 적힌 인식표를 달아야 해요." },
    ],
  },
  {
    id: "vaxrecord",
    category: "docs",
    title: "카페 입구에서 \"접종 기록 보여주세요\" 하면?",
    item: "접종 기록 바로 보여주기",
    why: "2026년 3월부터 동반 식당·카페는 손님 반려견 접종을 확인해요.",
    options: [
      { label: "폰에서 바로 보여줄 수 있어요", score: 2 },
      { label: "수첩·증명서가 집에 있어요", score: 1, action: "폰에 접종 기록 담아 두기", tip: VAX_TIP },
      { label: "어디 있는지 모르겠어요", score: 0, action: "병원에 접종 내역 요청하기", tip: `${VAX_TIP} 기록이 없으면 다니던 동물병원에 접종 내역을 요청해 보세요.` },
    ],
  },
  {
    id: "vaxdue",
    category: "docs",
    title: "종합백신·광견병, 맞을 때에 맞췄나요?",
    item: "접종 시기",
    why: "기록이 있어도 시기가 지났으면 다시 챙겨야 해요.",
    options: [
      { label: "네, 시기에 맞춰 맞았어요", score: 2 },
      { label: "언제 맞았는지 잘 모르겠어요", score: 1, action: "마지막 접종일 확인하기", tip: "마지막 접종일을 동물병원에 확인해 기록해 두면 다음 차례를 놓치지 않아요." },
      { label: "한참 지난 것 같아요", score: 0, action: "다음 접종 예약하기", tip: "다음 접종 시기를 동물병원과 상의해 주세요. 아이 건강과 외출 모두를 위한 기본이에요." },
    ],
  },
  {
    id: "leash",
    category: "gear",
    title: "산책할 때 줄은 어떻게 잡나요?",
    item: "줄 길이 2m",
    why: "외출할 땐 목줄·가슴줄을 2m 이내로 유지해야 해요.",
    options: [
      { label: "2m 안쪽으로 짧게 잡아요", score: 2 },
      {
        label: "자동줄을 길게 풀 때가 있어요",
        score: 1,
        action: "줄을 2m 안으로 짧게 잡기",
        tip: "외출할 땐 목줄·가슴줄을 2m 이내로 유지해야 해요. 줄이 길어도 짧게 잡으면 돼요. 아파트 복도·엘리베이터에선 안거나 목줄 목덜미 쪽을 잡아 주세요.",
      },
      {
        label: "줄 없이 다닐 때도 있어요",
        score: 0,
        action: "외출할 땐 항상 줄 하기",
        tip: "외출할 땐 목줄이나 가슴줄을 하고 2m 이내로 유지해야 해요. 순한 아이여도 갑자기 뛰어나갈 수 있어요.",
      },
    ],
  },
  {
    id: "poop",
    category: "gear",
    title: "배변봉투, 챙기고 나가나요?",
    item: "배변봉투",
    why: "배설물은 바로 수거해야 해요.",
    options: [
      { label: "항상 챙겨요", score: 2 },
      { label: "가끔 잊어요", score: 1, action: "목줄에 봉투 케이스 달기", tip: "배설물은 바로 수거해야 해요. 목줄 손잡이에 봉투 케이스를 달아 두면 잊지 않아요." },
      { label: "잘 안 챙겨요", score: 0, action: "배변봉투 챙기기", tip: "배설물은 바로 수거해야 해요. 동반 매장에선 배변패드·물티슈까지 챙기면 좋아요." },
    ],
  },
  {
    id: "carrier",
    category: "gear",
    title: "실내 매장에 들어갈 때 쓸 이동장이 있나요?",
    item: "이동장·슬링",
    why: "실내 매장·박람회는 이동장을 권하는 곳이 많아요.",
    options: [
      { label: "이동장·슬링·유모차가 있어요", score: 2 },
      { label: "중·대형견이라 해당 없어요", score: 2 },
      {
        label: "작은 아이인데 아직 없어요",
        score: 1,
        action: "이동장·슬링 준비하기",
        tip: "실내 매장·박람회는 이동장이나 안을 수 있는 준비를 권하는 곳이 많아요. 있으면 갈 수 있는 곳이 늘어나요.",
      },
    ],
  },
  {
    id: "calm",
    category: "behavior",
    title: "낯선 사람이나 다른 개를 만나면?",
    item: "낯선 상황 차분함",
    why: "동반 매장엔 다른 손님과 개가 가까이 있어요.",
    options: [
      { label: "대체로 차분해요", score: 2 },
      {
        label: "잠깐 짖다가 진정해요",
        score: 1,
        action: "한산한 시간에 짧게 연습하기",
        tip: "사람이 적은 시간대에 짧게 가 보고, 차분할 때마다 간식으로 보상해 주세요.",
      },
      {
        label: "계속 짖거나 달려들려고 해요",
        score: 0,
        action: "거리 두기 연습부터 하기",
        tip: "붐비는 매장은 아직 이르러요. 멀리서 보기→거리 좁히기 순으로 연습하고, 심하면 행동 전문 수의사와 상담해 보세요.",
      },
    ],
  },
  {
    id: "stay",
    category: "behavior",
    title: "자리에서 \"기다려\" 하면 얼마나 있을 수 있나요?",
    item: "자리에 머물기",
    why: "매장에선 정해진 자리에 머물러야 해요.",
    options: [
      { label: "10분 넘게 괜찮아요", score: 2 },
      {
        label: "잠깐은 해요",
        score: 1,
        action: "매트 위 기다려 늘리기",
        tip: "동반 매장에선 자리에 머물러야 해요. 집에서 매트 위 기다려를 1분→5분→10분으로 늘려 보세요.",
      },
      {
        label: "잘 안 돼요",
        score: 0,
        action: "집에서 기다려 연습하기",
        tip: "동반 매장에선 자리에 머물러야 해요. 익숙한 매트를 깔아 주고 집에서 짧게부터 연습해요.",
      },
    ],
  },
  {
    id: "marking",
    category: "behavior",
    title: "새로운 실내 공간에서 마킹·실수를 하나요?",
    item: "실내 배변 매너",
    why: "실수 한 번이면 그 매장은 다시 가기 어려워져요.",
    options: [
      { label: "거의 안 해요", score: 2 },
      { label: "가끔 해요", score: 1, action: "들어가기 전 배변 산책하기", tip: "들어가기 전에 배변 산책을 먼저 하고, 필요하면 매너벨트를 챙겨요." },
      { label: "자주 해요", score: 0, action: "매너벨트 챙기기", tip: "들어가기 전에 꼭 배변 산책을 하고, 매너벨트나 기저귀를 챙겨 주세요." },
    ],
  },
];

const CATEGORY_LABELS: Record<Category, string> = {
  docs: "서류·기록",
  gear: "외출 준비물",
  behavior: "매장 매너",
};

const C = {
  bg: "#FAF3EE",
  card: "#FFFDFB",
  line: "#EBDDD3",
  ink: "#2E2620",
  sub: "#7A6F66",
  faint: "#B3A79D",
  stamp: "#B4472F",
  good: "#3F7D4E",
  warn: "#C27C1E",
};

function grade(score: number) {
  if (score >= 90) return { label: "바로 나가도 돼요", mark: ["외출", "OK"] };
  if (score >= 70) return { label: "거의 다 됐어요", mark: ["거의", "완료"] };
  if (score >= 50) return { label: "몇 가지만 챙기면 돼요", mark: ["준비", "중"] };
  return { label: "하나씩 챙겨 봐요", mark: ["첫", "걸음"] };
}

function barColor(v: number) {
  if (v >= 80) return C.good;
  if (v >= 50) return C.warn;
  return C.stamp;
}

function statusIcon(score: number) {
  if (score === 2) return { icon: "✓", color: C.good };
  if (score === 1) return { icon: "!", color: C.warn };
  return { icon: "✕", color: C.stamp };
}

export function OutingCheckPage() {
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [tapped, setTapped] = useState<number | null>(null);
  const target = useMemo(() => detectStoreTarget(), []);

  useEffect(() => {
    document.title = "반려견 외출 준비도 진단 · 발도장";
  }, []);

  const total = QUESTIONS.length;
  const picked = answers.map((idx, i) => QUESTIONS[i].options[idx]);
  const score = Math.round((picked.reduce((s, o) => s + o.score, 0) / (total * 2)) * 100);
  const g = grade(score);
  const categories: Category[] = ["docs", "gear", "behavior"];
  const categoryScore = (cat: Category) => {
    const items = QUESTIONS.map((q, i) => ({ q, o: picked[i] })).filter((x) => x.q.category === cat && x.o);
    const max = items.length * 2;
    return max ? Math.round((items.reduce((s, x) => s + x.o.score, 0) / max) * 100) : 0;
  };
  const scores = categories.map(categoryScore);
  const weakest = Math.min(...scores) < 100 ? categories[scores.indexOf(Math.min(...scores))] : null;
  const rows = QUESTIONS.map((q, i) => ({ q, o: picked[i] })).filter((x) => x.o);
  const todo = rows.filter((x) => x.o.score < 2).sort((x, y) => x.o.score - y.o.score);
  const done = rows.filter((x) => x.o.score === 2);
  const vaxGap = todo.some((x) => x.q.id === "vaxrecord");

  const pick = (optionIndex: number) => {
    if (tapped !== null) return;
    setTapped(optionIndex);
    window.setTimeout(() => {
      setTapped(null);
      const next = [...answers, optionIndex];
      setAnswers(next);
      if (step + 1 < total) setStep(step + 1);
      else {
        setPhase("result");
        window.scrollTo({ top: 0 });
      }
    }, 180);
  };

  const back = () => {
    if (step === 0) {
      setPhase("intro");
      return;
    }
    setAnswers(answers.slice(0, -1));
    setStep(step - 1);
  };

  const restart = () => {
    setAnswers([]);
    setStep(0);
    setPhase("quiz");
    window.scrollTo({ top: 0 });
  };

  const share = async () => {
    const url = `${window.location.origin}/check`;
    const text = `우리 개 외출 준비도 ${score}점, '${g.label}' 도장 받았어요. 너희 개는?`;
    try {
      if (navigator.share) await navigator.share({ title: "반려견 외출 준비도 진단", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert("링크를 복사했어요!");
      }
    } catch {
      /* 사용자가 공유 취소 */
    }
  };

  const playUrl = `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent("utm_source=outing_check")}`;
  const stores =
    target === "ios"
      ? [{ url: APP_STORE_URL, label: "App Store에서 받기" }]
      : target === "android"
        ? [{ url: playUrl, label: "Google Play에서 받기" }]
        : [
            { url: APP_STORE_URL, label: "App Store" },
            { url: playUrl, label: "Google Play" },
          ];

  const q = QUESTIONS[step];
  const card = { background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 14 } as const;

  return (
    <main style={{ minHeight: "100vh", background: C.bg, padding: "28px 16px 56px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <a href="/" style={{ display: "inline-block", fontSize: 13, fontWeight: 800, color: C.stamp, marginBottom: 18, textDecoration: "none" }}>
          🐾 발도장 · 외출 준비도 진단
        </a>

        {phase === "intro" ? (
          <section style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.ink, lineHeight: 1.3, margin: "8px 0 12px", letterSpacing: "-0.02em", wordBreak: "keep-all" }}>
              우리 개랑 카페 갈 준비,
              <br />
              몇 점일까요?
            </h1>
            <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.65, margin: "0 0 24px" }}>
              10문항, 1분이면 끝나요.
              <br />
              빠진 것과 지금 할 일을 항목별로 알려드려요.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 8, textAlign: "left" }}>
              {categories.map((cat) => (
                <li key={cat} style={{ ...card, padding: "12px 16px", fontSize: 14, color: C.ink, fontWeight: 700 }}>
                  {CATEGORY_LABELS[cat]}
                  <span style={{ color: C.sub, fontWeight: 600 }}>
                    {" "}
                    · {QUESTIONS.filter((x) => x.category === cat).map((x) => x.item).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <PrimaryButton onClick={() => setPhase("quiz")}>진단 시작하기</PrimaryButton>
            <p style={{ fontSize: 12, color: C.sub, marginTop: 12 }}>회원가입 없이 바로 결과를 볼 수 있어요</p>
          </section>
        ) : phase === "quiz" ? (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <button
                type="button"
                onClick={back}
                style={{ border: 0, background: "none", color: C.sub, fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 44, padding: "0 8px", marginLeft: -8 }}
              >
                ← 이전
              </button>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>
                {CATEGORY_LABELS[q.category]} · {step + 1} / {total}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: C.line, overflow: "hidden", marginBottom: 26 }}>
              <div style={{ height: "100%", width: `${((step + 1) / total) * 100}%`, background: C.stamp, transition: "width 0.25s ease" }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, lineHeight: 1.4, margin: "0 0 8px", wordBreak: "keep-all" }}>{q.title}</h2>
            <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.55, margin: "0 0 22px" }}>{q.why}</p>
            <div style={{ display: "grid", gap: 10 }}>
              {q.options.map((o, idx) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => pick(idx)}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    border: tapped === idx ? `2px solid ${C.stamp}` : `1.5px solid ${C.line}`,
                    background: tapped === idx ? "#FBEDE8" : C.card,
                    color: C.ink,
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.45,
                    transition: "background 0.12s ease",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div style={{ ...card, borderRadius: 22, padding: "24px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.sub, margin: 0 }}>우리 개 외출 준비도</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "10px 0 6px" }}>
                <span style={{ fontSize: 56, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em" }}>{score}</span>
                <span
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    border: `4px solid ${C.stamp}`,
                    color: C.stamp,
                    fontSize: 13,
                    fontWeight: 900,
                    lineHeight: 1.15,
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "rotate(-10deg)",
                  }}
                >
                  <span>{g.mark[0]}</span>
                  <span>{g.mark[1]}</span>
                </span>
              </div>
              <p style={{ fontSize: 18, fontWeight: 900, color: C.ink, margin: "0 0 16px" }}>{g.label}</p>
              <button
                type="button"
                onClick={share}
                style={{ width: "100%", padding: 12, borderRadius: 14, border: 0, background: C.stamp, color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", marginBottom: 20 }}
              >
                우리 개 결과 공유하기
              </button>
              <div style={{ display: "grid", gap: 10, textAlign: "left" }}>
                {categories.map((cat, i) => {
                  const v = scores[i];
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
                        <span>
                          {CATEGORY_LABELS[cat]}
                          {weakest === cat ? <span style={{ fontSize: 11, color: C.stamp, marginLeft: 6 }}>가장 약해요</span> : null}
                        </span>
                        <span style={{ color: barColor(v) }}>{v}점</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: C.line, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${v}%`, background: barColor(v) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {todo.length ? (
              <>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: C.ink, margin: "28px 0 12px" }}>지금 할 일 {todo.length}개</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  {todo.map(({ q: question, o }) => {
                    const st = statusIcon(o.score);
                    return (
                      <li key={question.id} style={{ ...card, display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px" }}>
                        <span
                          aria-hidden
                          style={{
                            flex: "none",
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: st.color,
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 900,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 1,
                          }}
                        >
                          {st.icon}
                        </span>
                        <span style={{ lineHeight: 1.55 }}>
                          <b style={{ display: "block", fontSize: 15, color: C.ink }}>{o.action ?? question.item}</b>
                          <span style={{ display: "block", fontSize: 13, color: C.sub, marginTop: 2 }}>{o.tip}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: "24px 0 0" }}>빠진 게 없어요. 오늘 같이 나가 보세요! 🐾</p>
            )}

            <div style={{ marginTop: 24, background: C.ink, color: "#FFF8F2", borderRadius: 22, padding: "22px 20px" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#F2B8A6", margin: "0 0 6px" }}>
                {vaxGap ? "점수를 가장 빨리 올리는 방법" : "다음 외출을 더 가볍게"}
              </p>
              <p style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.4, margin: "0 0 8px" }}>
                접종 기록, 매장 입구에서
                <br />
                QR 하나로 보여주세요
              </p>
              <p style={{ fontSize: 14, color: "#E6D9CF", lineHeight: 1.6, margin: "0 0 16px" }}>
                발도장 외출 패스에 접종 기록을 모아 두면 직원이 QR을 찍어 바로 확인할 수 있어요. 산책·접종 시기도 함께 챙겨 드려요. (공식 증명서를 대신하지는 않아요.)
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {stores.map((st) => (
                  <a
                    key={st.url}
                    href={st.url}
                    style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 14, background: "#FFF8F2", color: C.ink, fontWeight: 900, fontSize: 15, textDecoration: "none" }}
                  >
                    {st.label}
                  </a>
                ))}
              </div>
            </div>

            {done.length ? (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 900, color: C.ink, margin: "26px 0 10px" }}>잘 챙기고 있는 것</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {done.map(({ q: question }) => (
                    <span key={question.id} style={{ background: "#EEF5EF", color: C.good, borderRadius: 999, padding: "6px 10px", fontSize: 13, fontWeight: 800 }}>
                      ✓ {question.item}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            <div style={{ marginTop: 20 }}>
              <SecondaryButton onClick={restart}>다시 하기</SecondaryButton>
            </div>

            <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, marginTop: 24 }}>
              이 진단은 일반 정보예요. 법률 자문이 아니며, 동반 출입 기준은 매장마다 달라요. 참고: 식품위생법 시행규칙 개정(2026.3 시행,
              동반 음식점 접종 확인), 동물보호법 시행규칙(외출 시 목줄·가슴줄 2m 이내, 2022.2 시행).{" "}
              <a href="/blog/pet-friendly-restaurant-vaccination-check/" style={{ color: C.ink }}>
                자세히 보기
              </a>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: "100%", padding: "17px 20px", borderRadius: 16, border: 0, background: C.stamp, color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: "100%", padding: "14px 12px", borderRadius: 14, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

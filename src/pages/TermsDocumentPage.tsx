import { useEffect, useState } from "react";
import { fetchPublicTerms, type PublicTerms, type TermsType } from "../lib/termsApi";

// 약관 종류별 페이지 메타데이터. document.title/meta-description은 클라이언트에서 갱신한다.
const META: Record<TermsType, { title: string; description: string }> = {
  TERMS: { title: "서비스 이용약관 — 발도장", description: "발도장 서비스 이용약관입니다." },
  PRIVACY: { title: "개인정보 수집·이용 동의 — 발도장", description: "발도장 가입 시 개인정보 수집·이용 동의 내용입니다." },
  LOCATION: { title: "위치기반서비스 이용약관 — 발도장", description: "발도장 위치기반서비스 이용약관입니다." },
  MARKETING: { title: "마케팅 정보 수신 동의 — 발도장", description: "발도장 마케팅·광고성 정보 수신 동의 내용입니다." },
  PRIVACY_POLICY: { title: "개인정보처리방침 — 발도장", description: "발도장 모바일 앱의 개인정보처리방침입니다." },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

function formatEffectiveAt(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : DATE_FORMATTER.format(d);
}

export function TermsDocumentPage({ type }: { type: TermsType }) {
  const [doc, setDoc] = useState<PublicTerms | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const meta = META[type];
    const previousTitle = document.title;
    document.title = meta.title;
    const descMeta = document.querySelector('meta[name="description"]');
    const previousDesc = descMeta?.getAttribute("content") ?? null;
    if (descMeta) descMeta.setAttribute("content", meta.description);
    return () => {
      document.title = previousTitle;
      if (descMeta && previousDesc !== null) descMeta.setAttribute("content", previousDesc);
    };
  }, [type]);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    fetchPublicTerms(type)
      .then((data) => {
        if (!cancelled) setDoc(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "약관을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  if (error) {
    return (
      <article className="privacy-page">
        <h1>약관을 불러올 수 없습니다</h1>
        <p className="updated">{error}</p>
      </article>
    );
  }

  if (!doc) {
    return (
      <article className="privacy-page">
        <h1>{META[type].title.split(" — ")[0]}</h1>
        <p className="updated">약관을 불러오는 중...</p>
      </article>
    );
  }

  const effectiveLabel = formatEffectiveAt(doc.effectiveAt);

  return (
    <article className="privacy-page">
      <h1>{doc.title}</h1>
      {effectiveLabel ? <p className="updated">시행일: {effectiveLabel}</p> : null}
      <div className="terms-body">{doc.content}</div>
    </article>
  );
}

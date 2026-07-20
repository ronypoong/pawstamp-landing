import { useEffect, useState } from "react";
import {
  fetchPublicTerms,
  fetchPublicTermsVersion,
  fetchPublicTermsVersions,
  type PublicTerms,
  type PublicTermsVersion,
  type TermsType,
} from "../lib/termsApi";

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
  const [versions, setVersions] = useState<PublicTermsVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
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

  // type 변경 시: 현재본 본문 + 버전 이력을 함께 로드. 선택 버전은 현재본으로 초기화.
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    setVersions([]);
    setSelectedVersion(null);
    fetchPublicTerms(type)
      .then((data) => {
        if (!cancelled) {
          setDoc(data);
          setSelectedVersion(data.version);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "약관을 불러오지 못했습니다.");
      });
    fetchPublicTermsVersions(type)
      .then((list) => {
        if (!cancelled) setVersions(list);
      })
      .catch(() => {
        /* 이력 로드 실패는 치명적이지 않음 — 현재본만 노출 */
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  const handleSelectVersion = (version: string) => {
    if (version === selectedVersion) return;
    setSelectedVersion(version);
    setDoc(null);
    setError(null);
    fetchPublicTermsVersion(type, version)
      .then((data) => setDoc(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "약관을 불러오지 못했습니다."));
  };

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
      {versions.length > 1 ? (
        <p className="updated" style={{ marginTop: 8 }}>
          <label>
            개정 이력:{" "}
            <select
              value={selectedVersion ?? doc.version}
              onChange={(e) => handleSelectVersion(e.target.value)}
              style={{ font: "inherit", padding: "2px 6px" }}
            >
              {versions.map((v) => {
                const eff = formatEffectiveAt(v.effectiveAt);
                const tag = v.status === "PUBLISHED" ? "현재" : "종전";
                return (
                  <option key={v.version} value={v.version}>
                    v{v.version} ({tag}){eff ? ` · ${eff} 시행` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        </p>
      ) : null}
      <div className="terms-body">{doc.content}</div>
    </article>
  );
}

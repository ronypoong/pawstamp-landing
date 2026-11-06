import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PartnerApiError, updatePartnerMe, updateVenue, type Venue } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

/** 내 정보: 표시 이름 수정, 매장별 체크인 받기 켜고 끄기, 로그아웃. */
export function PartnerMePage() {
  const { me, setMe, venues, reloadVenues, logout, handleAuthError } = usePartner();
  const [name, setName] = useState(me.name ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    document.title = "내 정보 — 발도장 파트너";
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage({ ok: false, text: "이름을 입력해 주세요." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updatePartnerMe(trimmed);
      setMe(updated);
      setMessage({ ok: true, text: "저장했어요." });
    } catch (err) {
      if (handleAuthError(err)) return;
      setMessage({ ok: false, text: err instanceof PartnerApiError ? err.message : "저장하지 못했어요." });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(v: Venue) {
    const ok = window.confirm(
      v.active
        ? `'${v.name}'의 체크인 받기를 끌까요?\n포스터 QR을 찍어도 체크인이 되지 않아요.`
        : `'${v.name}'의 체크인 받기를 다시 켤까요?`,
    );
    if (!ok) return;
    setTogglingId(v.id);
    try {
      await updateVenue(v.id, { active: !v.active });
      await reloadVenues();
    } catch (err) {
      if (!handleAuthError(err)) window.alert(err instanceof PartnerApiError ? err.message : "변경하지 못했어요.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        <h1 className="p-title">내 정보</h1>
      </header>

      <form className="p-card" onSubmit={saveName} noValidate>
        <div className="p-field">
          <span className="p-label">로그인 이메일</span>
          <p className="p-static">{me.email}</p>
        </div>
        <label className="p-field">
          <span className="p-label">사장님 이름</span>
          <input
            className="p-input"
            value={name}
            maxLength={30}
            placeholder="예) 김멍멍"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {message && (
          <p className={message.ok ? "p-success" : "p-error"} role="status">
            {message.text}
          </p>
        )}
        <button type="submit" className="p-btn p-btn--primary" disabled={busy || name.trim() === (me.name ?? "")}>
          {busy ? "저장 중…" : "저장"}
        </button>
      </form>

      <section className="p-card">
        <h2 className="p-card-title">내 매장</h2>
        <ul className="p-venue-list">
          {venues.map((v) => (
            <li key={v.id}>
              <div className="p-venue-info">
                <span className="p-venue-name">{v.name}</span>
                <span className="p-venue-meta">
                  {v.active ? "체크인 받는 중" : "체크인 꺼짐"}
                  {v.petCafeId ? " · 나들이 장소 연결됨" : ""}
                </span>
              </div>
              <button
                type="button"
                className="p-btn p-btn--ghost p-btn--sm"
                disabled={togglingId === v.id}
                onClick={() => void toggle(v)}
              >
                {v.active ? "끄기" : "켜기"}
              </button>
            </li>
          ))}
        </ul>
        <Link className="p-btn p-btn--ghost p-btn--block" to="/partner/venues/new">
          + 매장 추가
        </Link>
      </section>

      <button
        type="button"
        className="p-btn p-btn--text p-btn--block"
        onClick={() => {
          if (window.confirm("로그아웃할까요?")) logout();
        }}
      >
        로그아웃
      </button>
    </div>
  );
}

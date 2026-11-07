import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PartnerApiError, deleteVenue } from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";

/**
 * 매장 삭제 확인(/partner/delete?venue=id).
 * 되돌릴 수 없으므로 결과를 먼저 알리고, 매장명을 그대로 입력해야 버튼이 켜진다.
 */
export function PartnerDeletePage() {
  const { venues, reloadVenues, selectVenue, handleAuthError } = usePartner();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const target = venues.find((v) => v.id === Number(params.get("venue"))) ?? null;
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "매장 삭제 — 발도장 파트너";
  }, []);

  if (!target) {
    return (
      <div className="p-narrow">
        <section className="p-card p-empty">
          <p className="p-empty-title">삭제할 매장을 찾지 못했어요</p>
          <Link className="p-btn p-btn--ghost p-btn--sm" to="/partner/me">
            내 정보로
          </Link>
        </section>
      </div>
    );
  }

  const matches = typed.trim() === target.name.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!target || !matches) return;
    setBusy(true);
    setError(null);
    try {
      await deleteVenue(target.id, typed.trim());
      const rest = await reloadVenues();
      if (rest.length > 0) {
        selectVenue(rest[0].id);
        navigate("/partner/me", { replace: true, state: { deleted: target.name } });
      } else {
        navigate("/partner/venues/new", { replace: true });
      }
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof PartnerApiError ? err.message : "삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <div className="p-narrow">
      <header className="p-page-head">
        <h1 className="p-title">
          <span className="vt-venue">{target.name}</span> <span className="vt-suffix vd-suffix">삭제</span>
        </h1>
      </header>

      <form className="p-card" onSubmit={submit} noValidate>
        <p className="vd-lead">삭제하기 전에 꼭 확인해 주세요.</p>
        <ul className="vd-list">
          <li>발도장 앱 나들이 목록과 지도에서 이 매장 소개가 사라져요.</li>
          <li>붙여 둔 QR 포스터로는 더 이상 체크인할 수 없어요.</li>
          <li>방문 기록·통계·사진·소개를 이 화면에서 다시 볼 수 없어요.</li>
          <li>
            <b>되돌릴 수 없어요.</b> 잠시 쉬려는 거라면 삭제 대신 <Link to="/partner/me">내 정보</Link>에서 체크인 받기를 꺼 주세요.
          </li>
        </ul>

        <label className="p-field">
          <span className="p-label">확인을 위해 아래 매장 이름을 똑같이 써 주세요</span>
          <span className="vd-name">{target.name}</span>
          <input
            className="p-input"
            autoComplete="off"
            placeholder={target.name}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-invalid={typed.length > 0 && !matches}
          />
        </label>
        {error && (
          <p className="p-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="p-btn p-btn--danger p-btn--block" disabled={!matches || busy}>
          {busy ? "삭제 중…" : "이 매장 삭제하기"}
        </button>
        <Link className="p-link p-link--center" to="/partner/me">
          취소
        </Link>
      </form>
    </div>
  );
}

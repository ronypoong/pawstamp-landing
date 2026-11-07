/** 라벨 + 설명 한 줄 + 토글 스위치(매장 표시·체크인 설정용). 행 전체가 44px 이상 터치 영역. */
export function VenueSwitch({
  label,
  desc,
  on,
  disabled,
  warn,
  onChange,
}: {
  /** 꺼져서 주의가 필요한 상태(설명을 경고색으로) */
  warn?: boolean;
  label: string;
  desc: string;
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={`vs-row${disabled ? " is-disabled" : ""}`}>
      <span className="vs-text">
        <span className="vs-label">{label}</span>
        <span className={`vs-desc${warn ? " is-warn" : ""}`}>{desc}</span>
      </span>
      <span className="pf-switch vs-switch">
        <input type="checkbox" role="switch" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
        <span className="pf-switch-track" aria-hidden />
      </span>
    </label>
  );
}

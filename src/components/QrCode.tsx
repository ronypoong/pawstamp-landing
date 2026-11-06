import { useMemo } from "react";
import qrcode from "qrcode-generator";

interface Props {
  value: string;
  /** 렌더 크기(px 또는 CSS 길이). viewBox 기반이라 인쇄 시 선명. */
  size?: number | string;
  className?: string;
  label?: string;
}

/** 클라이언트 QR(SVG). 오류 정정 Q(25%) — 인쇄물 일부가 긁히거나 반사돼도 읽히도록. */
export function QrCode({ value, size = 240, className, label = "체크인 QR 코드" }: Props) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, "Q");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);

  const box = count + 8; // 사방 4모듈 여백(quiet zone)
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={box} height={box} fill="#fff" />
      <path d={path} fill="#2e2823" />
    </svg>
  );
}

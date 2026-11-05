interface Props {
  className?: string;
  size?: number;
}

/**
 * 발도장 브랜드 마크 — 붉은 사각 인장(낙관)에 발바닥 음각. 앱 아이콘과 같은 모양(2026-11 리디자인 C안).
 * 원본: pawstamp-fe/resources/brand/seal*.svg
 */
export function BrandPaw({ className, size = 28 }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="18 18 64 64" role="img" aria-label="발도장">
      <g transform="rotate(3 50 50)">
        <rect x="20" y="20" width="60" height="60" rx="9" fill="#c4563c" />
        <g fill="#fbf6ee" transform="translate(50 54.2) scale(0.465)">
          <ellipse cx="-27" cy="-14" rx="9" ry="12" transform="rotate(-24 -27 -14)" />
          <ellipse cx="-10" cy="-33" rx="10" ry="13" transform="rotate(-8 -10 -33)" />
          <ellipse cx="10" cy="-33" rx="10" ry="13" transform="rotate(8 10 -33)" />
          <ellipse cx="27" cy="-14" rx="9" ry="12" transform="rotate(24 27 -14)" />
          <path d="M0-8C13-8 29 8 29 19C29 29 21 33 12 31C6 30 3 28 0 28C-3 28-6 30-12 31C-21 33-29 29-29 19C-29 8-13-8 0-8Z" />
        </g>
      </g>
    </svg>
  );
}

interface Props {
  className?: string;
  size?: number;
}

/**
 * 앱 런처 아이콘과 동일한 모양/색감의 발도장 브랜드 마크.
 * (green 라운드 사각 배경 + 흰색 paw)
 */
export function BrandPaw({ className, size = 28 }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="발도장"
    >
      <rect width="24" height="24" rx="5" fill="#16A34A" />
      <path
        fill="#fff"
        d="M8.5 11.5c1.4 0 2.2 1.1 3.5 1.1s2.1-1.1 3.5-1.1c1.8 0 3.2 1.5 3.2 3.4 0 2.8-2.4 4.1-5.1 4.1h-3.2c-2.7 0-5.1-1.3-5.1-4.1 0-1.9 1.4-3.4 3.2-3.4Z"
      />
      <circle fill="#fff" cx="6.7" cy="8.2" r="1.9" />
      <circle fill="#fff" cx="10.3" cy="5.7" r="1.9" />
      <circle fill="#fff" cx="13.7" cy="5.7" r="1.9" />
      <circle fill="#fff" cx="17.3" cy="8.2" r="1.9" />
    </svg>
  );
}

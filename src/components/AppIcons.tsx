import type { SVGProps } from "react";

/**
 * 발도장 앱(pawstamp-fe)의 실제 라인 아이콘을 그대로 가져왔다.
 * stroke=currentColor 라서 색은 부모 color 로 제어한다.
 */
function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="m3 10.5 9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </Svg>
);

export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </Svg>
);

export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const ChatIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-5A8 8 0 1 1 21 12Z" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
  </Svg>
);

export const UserIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);

export const SyringeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="m18 2 4 4" />
    <path d="m17 7 3-3" />
    <path d="M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5" />
    <path d="m9 11 4 4" />
    <path d="m5 19-3 3" />
  </Svg>
);

export const MedicalChartIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M9 3h6l1 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3Z" />
    <path d="M9 5h6" />
    <path d="M12 10v6" />
    <path d="M9 13h6" />
  </Svg>
);

export const MessageIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A4 4 0 0 1 3 15V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
  </Svg>
);

export const EditIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);

export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect height="18" rx="3" width="18" x="3" y="4" />
    <path d="M3 10h18" />
  </Svg>
);

export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const PawIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M8.5 11.5c1.4 0 2.2 1.1 3.5 1.1s2.1-1.1 3.5-1.1c1.8 0 3.2 1.5 3.2 3.4 0 2.8-2.4 4.1-5.1 4.1h-3.2c-2.7 0-5.1-1.3-5.1-4.1 0-1.9 1.4-3.4 3.2-3.4Z" />
    <circle cx="6.7" cy="8.2" r="1.9" />
    <circle cx="10.3" cy="5.7" r="1.9" />
    <circle cx="13.7" cy="5.7" r="1.9" />
    <circle cx="17.3" cy="8.2" r="1.9" />
  </Svg>
);

export const ShieldIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-5" />
  </Svg>
);

export const HeartIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M20.8 5.6a5.4 5.4 0 0 0-7.6 0L12 6.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
  </Svg>
);

export const SparkleIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.2 11l2.5 1-2.5 1L12 15.5 10.8 13l-2.5-1 2.5-1L12 8.5Z" />
  </Svg>
);

export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 6" />
    <path d="M17 14.5a5.5 5.5 0 0 1 3.5 5.5" />
  </Svg>
);

export const BellIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
);

export const RainbowIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M3 18a9 9 0 0 1 18 0" />
    <path d="M6 18a6 6 0 0 1 12 0" />
    <path d="M9 18a3 3 0 0 1 6 0" />
  </Svg>
);

/* 스토어 배지용 채움(fill) 아이콘 — stroke 래퍼를 쓰지 않는다. */
export const AppleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.47 7.83 1.3 10.39.86 1.25 1.89 2.66 3.23 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.28-1.28 3.13-2.54.98-1.45 1.39-2.85 1.41-2.93-.03-.01-2.71-1.04-2.74-4.12z" />
    <path d="M14.62 4.84c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.59 3.03-1.46z" />
  </svg>
);

export const GooglePlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path d="M3.6 2.3a1 1 0 0 0-.6.92v17.56a1 1 0 0 0 .6.92l9.7-9.7L3.6 2.3Z" fill="#00C3FF" />
    <path d="M16.9 8.7 13.3 12l-9.7 9.7c.27.1.58.06.86-.1l11.44-6.5L16.9 8.7Z" fill="#FF3D44" />
    <path d="M20.3 10.66 16.9 8.7l-2.9 3.3 2.9 3.3 3.4-1.96c.94-.54.94-1.86 0-2.4Z" fill="#FFCE00" />
    <path d="m3.6 2.3 9.7 9.7 3.6-3.3L4.46 2.2a.97.97 0 0 0-.86-.1Z" fill="#00D886" />
  </svg>
);

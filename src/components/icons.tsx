import type { SVGProps } from "react";

function Icon({ children, size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement> & { size?: number };

export const IconHome = (p: P) => (
  <Icon {...p}><path d="M2.5 6.5 8 2l5.5 4.5V13a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6.5Z" /><path d="M6 14V9.5h4V14" /></Icon>
);
export const IconList = (p: P) => (
  <Icon {...p}><path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" /></Icon>
);
export const IconCalendar = (p: P) => (
  <Icon {...p}><rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" /></Icon>
);
export const IconChart = (p: P) => (
  <Icon {...p}><path d="M2 14h12M4 11V8M7 11V4.5M10 11V6.5M13 11V2.5" /></Icon>
);
export const IconScale = (p: P) => (
  <Icon {...p}><rect x="2" y="2" width="12" height="12" rx="2.5" /><path d="M5.5 6.5a3.5 3.5 0 0 1 5 0L8.75 8" /></Icon>
);
export const IconPlus = (p: P) => <Icon {...p}><path d="M8 3v10M3 8h10" /></Icon>;
export const IconChevronLeft = (p: P) => <Icon {...p}><path d="M10 3 5 8l5 5" /></Icon>;
export const IconChevronRight = (p: P) => <Icon {...p}><path d="m6 3 5 5-5 5" /></Icon>;
export const IconChevronUp = (p: P) => <Icon {...p}><path d="m3.5 10 4.5-4.5 4.5 4.5" /></Icon>;
export const IconChevronDown = (p: P) => <Icon {...p}><path d="m3.5 6 4.5 4.5L12.5 6" /></Icon>;
export const IconTrash = (p: P) => (
  <Icon {...p}><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.6 9.1a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L12 4" /></Icon>
);
export const IconCheck = (p: P) => <Icon {...p}><path d="m3 8.5 3 3 7-7" /></Icon>;
export const IconPlay = (p: P) => <Icon {...p}><path d="M4.5 2.75v10.5L13 8 4.5 2.75Z" fill="currentColor" /></Icon>;
export const IconClock = (p: P) => <Icon {...p}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></Icon>;
export const IconCopy = (p: P) => (
  <Icon {...p}><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" /></Icon>
);
export const IconPencil = (p: P) => <Icon {...p}><path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5v-3l8-8Z" /></Icon>;
export const IconX = (p: P) => <Icon {...p}><path d="m4 4 8 8M12 4l-8 8" /></Icon>;
export const IconDumbbell = (p: P) => (
  <Icon {...p}><path d="M5 5v6M11 5v6M3 6.5v3M13 6.5v3M5 8h6M1.5 8H3M13 8h1.5" /></Icon>
);
export const IconLogout = (p: P) => (
  <Icon {...p}><path d="M6 14H3.5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1H6M10.5 11.5 14 8l-3.5-3.5M14 8H6" /></Icon>
);

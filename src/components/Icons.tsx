interface IconProps {
  className?: string;
}

export function IconDashboard({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="13" y="3" width="8" height="5" rx="2" fill="currentColor" />
      <rect x="13" y="10" width="8" height="11" rx="2" fill="currentColor" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" />
    </svg>
  );
}

export function IconPlayers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" fill="currentColor" />
      <circle cx="17" cy="9" r="2.2" fill="currentColor" />
      <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 14.6c1.6.2 3 1.2 3.6 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBat({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3.5 20.5 10 9 21.5 3.8 20.2 2.5 15 14 3.5Z" fill="currentColor" />
      <path d="M13 6.5 17.5 11" stroke="#071018" strokeWidth="1.4" />
    </svg>
  );
}

export function IconBoard({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18V6.5L12 3l8 3.5V18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3v11" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconHistory({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12a7 7 0 1 0 2-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 4.5V8h3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function StumpsMark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="8" width="4" height="28" rx="1" fill="currentColor" />
      <rect x="22" y="8" width="4" height="28" rx="1" fill="currentColor" />
      <rect x="34" y="8" width="4" height="28" rx="1" fill="currentColor" />
      <rect x="8" y="6" width="32" height="4" rx="1" fill="#f5c451" />
      <circle cx="38" cy="38" r="6" fill="#e23b3b" />
      <path d="M35 36.5c2 .2 4 1.4 5 3" stroke="#fff" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

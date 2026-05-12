interface PhoneIllustrationProps {
  accent?: string;
  accent2?: string;
  screen?: string;
  tilt?: number;
  size?: number | string;
  className?: string;
}

export function PhoneIllustration({
  accent = '#7C3AED',
  accent2 = '#A78BFA',
  screen = '#1E1B4B',
  tilt = 0,
  size = 180,
  className = '',
}: PhoneIllustrationProps) {
  return (
    <div
      className={className}
      style={{ width: size, transform: `rotate(${tilt}deg)`, transformOrigin: 'center' }}
    >
      <svg viewBox="0 0 120 240" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id={`pmBody-${accent.replace('#', '')}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={accent2} />
          </linearGradient>
          <linearGradient id={`pmGlare-${accent.replace('#', '')}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* body */}
        <rect x="6" y="6" width="108" height="228" rx="22" fill={`url(#pmBody-${accent.replace('#', '')})`} />
        {/* inner bezel */}
        <rect x="10" y="10" width="100" height="220" rx="18" fill="#0F172A" />
        {/* screen */}
        <rect x="13" y="14" width="94" height="212" rx="16" fill={screen} />
        {/* notch */}
        <rect x="46" y="18" width="28" height="8" rx="4" fill="#0F172A" />
        {/* speaker dot */}
        <circle cx="68" cy="22" r="1.5" fill="#1f2937" />
        {/* camera lens dot on notch */}
        <circle cx="56" cy="22" r="1.5" fill="#1f2937" />
        {/* glare */}
        <rect x="13" y="14" width="94" height="212" rx="16" fill={`url(#pmGlare-${accent.replace('#', '')})`} />
        {/* camera bump (back) — small simulated bump corner */}
        <rect x="14" y="20" width="22" height="22" rx="6" fill="#0F172A" opacity="0.18" />
        <circle cx="22" cy="29" r="3.5" fill="#0b1020" />
        <circle cx="30" cy="29" r="3.5" fill="#0b1020" />
        <circle cx="22" cy="37" r="3.5" fill="#0b1020" />

        {/* home indicator bar */}
        <rect x="44" y="220" width="32" height="3" rx="1.5" fill="#ffffff" opacity="0.4" />

        {/* subtle screen highlight blob */}
        <ellipse cx="78" cy="60" rx="22" ry="40" fill="#ffffff" opacity="0.06" />
      </svg>
    </div>
  );
}

const ACCENT_BY_BRAND: Record<string, [string, string]> = {
  Apple:    ['#1F2937', '#4B5563'],
  Samsung:  ['#1428A0', '#3B82F6'],
  Xiaomi:   ['#FF6900', '#FB923C'],
  OPPO:     ['#1BA784', '#10B981'],
  Vivo:     ['#415FFF', '#6366F1'],
  Realme:   ['#FFC915', '#F59E0B'],
  Honor:    ['#0F172A', '#475569'],
  Google:   ['#4285F4', '#60A5FA'],
  Huawei:   ['#FF0000', '#F87171'],
  OnePlus:  ['#F5010C', '#EF4444'],
  Nokia:    ['#124191', '#3B82F6'],
  LG:       ['#A50034', '#E11D48'],
  ASUS:     ['#0F172A', '#475569'],
  Sony:     ['#003087', '#1D4ED8'],
  Motorola: ['#E1140A', '#EF4444'],
  Lenovo:   ['#E2231A', '#EF4444'],
};

export function getBrandAccents(brand?: string): [string, string] {
  if (!brand) return ['#7C3AED', '#A78BFA'];
  return ACCENT_BY_BRAND[brand] ?? ['#7C3AED', '#A78BFA'];
}

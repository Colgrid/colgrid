// Simple line icons for badges (urban-cartography style: grids, pins, compass).
// Session badges (session-01, pilot-session-01…) show their number.
export default function BadgeIcon({ badgeKey, size = 28 }: { badgeKey: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const session = badgeKey.match(/session-(\d+)$/);
  if (session) {
    return (
      <svg {...common}>
        <path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4z" />
        <text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" stroke="none" fontFamily="monospace">
          {session[1].padStart(2, "0")}
        </text>
      </svg>
    );
  }
  switch (badgeKey) {
    case "founding": // a street grid with the first pin
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeWidth="1.2" />
          <circle cx="15" cy="9" r="2.4" fill="currentColor" />
        </svg>
      );
    case "maker": // hammer
      return (
        <svg {...common}>
          <path d="M14 4l6 6-2 2-6-6z" />
          <path d="M13 7l-9 9a1.4 1.4 0 0 0 2 2l9-9" />
        </svg>
      );
    case "scout": // compass
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" />
        </svg>
      );
    case "full-season": // a filled collection grid
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" fill="currentColor" />
        </svg>
      );
    case "two-city": // two pins
      return (
        <svg {...common}>
          <path d="M8 21s-5-5.2-5-9a5 5 0 0 1 10 0c0 3.8-5 9-5 9z" />
          <circle cx="8" cy="12" r="1.6" fill="currentColor" />
          <path d="M17 14s-3.5-3.6-3.5-6.3a3.5 3.5 0 0 1 7 0C20.5 10.4 17 14 17 14z" />
        </svg>
      );
    case "chapter-champion": // trophy
      return (
        <svg {...common}>
          <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
          <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8 21h8M9 21l1-4h4l1 4" />
        </svg>
      );
    default: // a star for anything new
      return (
        <svg {...common}>
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      );
  }
}

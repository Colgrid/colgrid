import Link from "next/link";
import { SITE } from "@/lib/site";

// Bottom tabs from the mockups: Pass · Check in · Team · Standings.
// All four tabs are live.
type Tab = { key: string; label: string; href: string | null };

// Standings only shows while the tournament is open (it's paused for now).
const TABS: Tab[] = [
  { key: "pass", label: "Pass", href: "/pass" },
  { key: "checkin", label: "Check in", href: "/check-in" },
  { key: "team", label: "Team", href: "/team" },
  ...(SITE.tournamentOpen ? [{ key: "standings", label: "Standings", href: "/standings" }] : []),
];

function Icon({ tab }: { tab: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true };
  switch (tab) {
    case "pass":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
    case "checkin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <path d="M12 3l9 9-9 9-9-9z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M6 20V11M12 20V5M18 20v-6" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function TabBar({ active }: { active: string }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar__inner">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const content = (
            <>
              <Icon tab={tab.key} />
              <span>{tab.label}</span>
            </>
          );
          if (!tab.href) {
            return (
              <span key={tab.key} className="tabbar__tab tabbar__tab--soon" aria-disabled="true" title="Coming soon">
                {content}
              </span>
            );
          }
          return (
            <Link key={tab.key} href={tab.href} className={`tabbar__tab${isActive ? " tabbar__tab--active" : ""}`} aria-current={isActive ? "page" : undefined}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

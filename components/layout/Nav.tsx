"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",          label: "Summary"     },
  { href: "/portfolio", label: "Portfolio"   },
  { href: "/zombies",   label: "Zombies"     },
  { href: "/gems",      label: "Gems"        },
  { href: "/explorer",  label: "Explorer"    },
  { href: "/insights",  label: "Insights"    },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 flex items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-800 tracking-tight hidden sm:block">Portfolio Intel</span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 flex-shrink-0" />

        {/* Nav links */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
          {navItems.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status dot */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-400 hidden lg:block">600 SKUs</span>
        </div>
      </div>
    </header>
  );
}

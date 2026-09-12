"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CheckSquare, Mic } from "lucide-react";

const links = [
  { href: "/", label: "다이어리", icon: Mic },
  { href: "/entries", label: "기록", icon: BookOpen },
  { href: "/todos", label: "할일", icon: CheckSquare },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[4.5rem] flex-col items-center gap-1 px-3 py-3 text-xs tracking-wide transition ${
                active
                  ? "text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-[var(--accent)]" : undefined}
              />
              <span className={active ? "font-semibold" : "font-medium"}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

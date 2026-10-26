"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useState } from "react";
import { LogoutButton } from "./client/logout-button";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const ICONS = {
  board: "M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z",
  inbox: "M4 4h16v10h-5l-1.5 2.5h-3L9 14H4zm0 10v6h16v-6",
  megaphone: "M3 10v4h3l7 4V6L6 10zm13-2a5 5 0 0 1 0 8",
  gauge: "M12 14l4-4M4 18a9 9 0 1 1 16 0",
  scale: "M12 3v18M5 7h14M5 7l-3 7h6zm14 0l-3 7h6z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15 3.1a3.5 3.5 0 0 1 0 6.8",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function PanelNav({ items, userName, roleLabel, institution }: { items: NavItem[]; userName: string; roleLabel: string; institution: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/panel" ? path === "/panel" : path.startsWith(href));
  const links = (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            onClick={() => setOpen(false)}
            aria-current={active(i.href) ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold transition-colors",
              active(i.href) ? "bg-white text-brand-dark" : "text-white/85 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon d={ICONS[i.icon]} />
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
  const footer = (
    <div className="border-t border-white/15 pt-4 text-sm text-white/85">
      <p className="font-bold text-white">{userName}</p>
      <p>{roleLabel}</p>
      <div className="mt-3 flex gap-2">
        <Link href="/" className="inline-flex min-h-[44px] items-center rounded-lg px-2 font-bold underline-offset-4 hover:underline">
          Portal
        </Link>
        <LogoutButton className="inline-flex min-h-[44px] items-center rounded-lg px-2 font-bold underline-offset-4 hover:underline" />
      </div>
    </div>
  );
  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between bg-brand-dark p-4 lg:flex">
        <div>
          <Link href="/panel" className="mb-6 flex items-center gap-2 px-2 pt-1">
            <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
              <path d="M33 12.5A15 15 0 1 0 35 20" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
              <circle cx="33.4" cy="12.6" r="3.2" fill="rgb(var(--sun))" />
            </svg>
            <span className="leading-tight">
              <span className="block font-display font-bold text-white">Talento 360°</span>
              <span className="block text-xs text-white/70">{institution}</span>
            </span>
          </Link>
          <nav aria-label="Panel de gestión">{links}</nav>
        </div>
        {footer}
      </aside>
      {/* Móvil */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-brand-dark px-4 py-3 lg:hidden">
        <Link href="/panel" className="font-display font-bold text-white">
          Talento 360°
        </Link>
        <button type="button" className="rounded-lg px-3 py-1.5 font-bold text-white ring-1 ring-white/30" aria-expanded={open} aria-controls="menu-movil" onClick={() => setOpen(!open)}>
          {open ? "Cerrar" : "Menú"}
        </button>
      </div>
      {open && (
        <div id="menu-movil" className="fixed inset-x-0 top-[52px] z-30 space-y-4 bg-brand-dark p-4 shadow-xl lg:hidden">
          <nav aria-label="Panel de gestión">{links}</nav>
          {footer}
        </div>
      )}
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import WorkspaceSelector from './WorkspaceSwitcher';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const nav = [
  { href: '/', label: 'Dashboard', icon: '◫' },
  { href: '/holdings', label: 'Holdings', icon: '▤' },
  { href: '/ranking', label: 'Master Ranking', icon: '★' },
  { href: '/optimizer', label: 'Optimizer', icon: '⇄' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">PSP</span>
          <div>
            <strong>Silver Phoenix</strong>
            <small>Portfolio Intelligence</small>
          </div>
        </div>
        <nav className="nav-list" aria-label="Hoofdnavigatie">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={active ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          Sprint 1 · lokale data
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">PROJECT SILVER PHOENIX</p>
            <h1>{nav.find((item) => item.href === pathname)?.label ?? 'Dashboard'}</h1>
          </div>
          <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "16px",
  }}
>
  <WorkspaceSwitcher/>

  <div className="topbar-badge">
    Phoenix Ranking V2
  </div>
</div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Mic,
  Users,
  Database,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/submissions', label: 'Submissions', icon: FileText },
  { href: '/admin/questions', label: 'Questions', icon: Database },
  { href: '/admin/exams/upload', label: 'Canonical Upload', icon: FileText },
  { href: '/admin/exams/canonical', label: 'Canonical Exams', icon: Database },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    // Assuming logged in since middleware protects this route
    // We could decode the JWT on the client, but for simplicity, we use the fallback
    setAdminEmail('admin@lcalpha.uz');
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    router.push('/admin');
  };

  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50" suppressHydrationWarning>
      {/* ---- Sidebar ---- */}
      <aside className="w-60 bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-30 shadow-xl">
        {/* Brand */}
        <div className="px-5 py-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-500 border border-teal-400 shadow-lg shadow-teal-500/30 relative">
              <Mic className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 text-base leading-none tracking-tight">Alpha LC</p>
              <p className="text-slate-400 text-xs mt-1 font-medium tracking-wide">Examiner</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div className="px-3 py-4 border-t border-slate-700/50">
          <div className="bg-slate-800 rounded-xl p-3 mb-3">
            <p className="text-xs text-slate-400 truncate">{adminEmail}</p>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">Administrator</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            id="admin-logout-btn"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}

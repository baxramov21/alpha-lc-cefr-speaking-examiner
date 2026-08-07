'use client';

import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';

export default function StudentsPage() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-teal-500" />
        </div>
        <h1 className="text-xl font-black text-slate-800 mb-2">Student Roster</h1>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          Student roster management will be available in Phase 3 after Supabase integration.
          For now, view submissions to see student activity.
        </p>
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          View Submissions <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

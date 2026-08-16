'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mic, Lock, User, Users, GraduationCap, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Passcode verification is now handled server-side via /api/auth/verify-passcode

const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  groupName: z.string().min(1, 'Group name is required'),
  teacherName: z.string().min(2, 'Teacher name is required'),
  passcode: z.string().min(4, 'Passcode is required'),
});

type FormData = z.infer<typeof schema>;

export default function StudentLoginPage() {
  const router = useRouter();
  const [showPasscode, setShowPasscode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setAuthError('');

    try {
      // Verify passcode server-side — never trust client-only validation
      const res = await fetch('/api/auth/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: data.passcode }),
      });

      if (res.status === 429) {
        setAuthError('Too many attempts. Please wait 15 minutes and try again.');
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setAuthError('Invalid or inactive passcode. Please check with your teacher.');
        setIsLoading(false);
        return;
      }

      const { token: sessionToken } = await res.json();

      // Store session metadata and the signed JWT — NOT the raw passcode
      sessionStorage.setItem(
        'examSession',
        JSON.stringify({
          fullName: data.fullName,
          groupName: data.groupName,
          teacherName: data.teacherName,
          sessionToken,          // signed JWT — never the raw passcode
          startedAt: new Date().toISOString(),
        })
      );

      router.push('/exam/setup');
    } catch {
      setAuthError('An error occurred while verifying the passcode. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-16 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10 text-center text-white max-w-sm">
          {/* Logo */}
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Mic className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-3 leading-tight">
            LC Alpha<br />
            <span className="font-light text-3xl text-teal-100">Speaking Examiner</span>
          </h1>
          <p className="text-teal-100 text-base leading-relaxed mb-10">
            AI-powered CEFR speaking assessment.<br />
            Instant, accurate, and detailed feedback.
          </p>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: '🎙️', text: 'Real-time audio recording' },
              { icon: '🤖', text: 'Gemini Flash AI evaluation' },
              { icon: '📊', text: 'Detailed CEFR band scoring' },
              { icon: '⚡', text: 'Instant results & feedback' },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-sm text-left"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-white/90 font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-800 text-lg leading-none">LC Alpha</p>
              <p className="text-xs text-muted-foreground">Speaking Examiner</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-black text-slate-800">Student Entry</h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                Enter your details provided by your teacher to begin.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="student-login-form">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="e.g. Azizbek Toshmatov"
                    className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500"
                    {...register('fullName')}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              {/* Group Name */}
              <div className="space-y-1.5">
                <Label htmlFor="groupName" className="text-sm font-semibold text-slate-700">
                  Group Name / ID
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="groupName"
                    placeholder="e.g. Group A - Morning"
                    className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500"
                    {...register('groupName')}
                  />
                </div>
                {errors.groupName && (
                  <p className="text-xs text-destructive">{errors.groupName.message}</p>
                )}
              </div>

              {/* Teacher Name */}
              <div className="space-y-1.5">
                <Label htmlFor="teacherName" className="text-sm font-semibold text-slate-700">
                  Teacher Name
                </Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="teacherName"
                    placeholder="e.g. Ms. Sarah Johnson"
                    className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500"
                    {...register('teacherName')}
                  />
                </div>
                {errors.teacherName && (
                  <p className="text-xs text-destructive">{errors.teacherName.message}</p>
                )}
              </div>

              {/* Passcode */}
              <div className="space-y-1.5">
                <Label htmlFor="passcode" className="text-sm font-semibold text-slate-700">
                  Passcode
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="passcode"
                    type={showPasscode ? 'text' : 'password'}
                    placeholder="Enter your passcode"
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500 font-mono tracking-widest"
                    {...register('passcode')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.passcode && (
                  <p className="text-xs text-destructive">{errors.passcode.message}</p>
                )}
              </div>

              {/* Auth error */}
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <span>{authError}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-base gap-2 transition-all duration-200 shadow-lg shadow-teal-500/25 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Begin Exam
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Admin link */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Are you a teacher?{' '}
            <a href="/admin" className="text-teal-600 hover:text-teal-700 font-semibold underline-offset-2 hover:underline">
              Admin Dashboard →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

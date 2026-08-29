'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mic, Lock, User, Users, GraduationCap, ChevronRight, Eye, EyeOff, BrainCircuit, BarChart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Passcode verification is now handled server-side via /api/auth/verify-passcode

const schema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  groupName: z.string().trim().min(1, 'Group name is required'),
  teacherName: z.string().trim().min(2, 'Teacher name is required'),
  passcode: z.string().trim().min(4, 'Passcode is required'),
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
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const fullName = watch('fullName');
  const groupName = watch('groupName');
  const teacherName = watch('teacherName');
  const passcode = watch('passcode');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setAuthError('');

    try {
      // Verify passcode server-side — never trust client-only validation
      // Transform inputs to uppercase
      const transformedData = {
        fullName: data.fullName.toUpperCase(),
        groupName: data.groupName.toUpperCase(),
        teacherName: data.teacherName.toUpperCase(),
        passcode: data.passcode.toUpperCase(),
      };

      const res = await fetch('/api/auth/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          passcode: data.passcode,
          fullName: transformedData.fullName 
        }),
      });

      if (res.status === 429) {
        setAuthError('Too many attempts. Please wait 5 minutes and try again.');
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setAuthError('Invalid or inactive passcode. Please contact your teacher.');
        setIsLoading(false);
        return;
      }

      const { token: sessionToken, allowSkip } = await res.json();

      // Store session metadata and the signed JWT — NOT the raw passcode
      sessionStorage.setItem(
        'examSession',
        JSON.stringify({
          fullName: transformedData.fullName,
          groupName: transformedData.groupName,
          teacherName: transformedData.teacherName,
          sessionToken,          // signed JWT — never the raw passcode
          allowSkip,             // Skip permission toggle
          startedAt: new Date().toISOString(),
        })
      );

      router.push('/dashboard');
    } catch {
      setAuthError('An error occurred while verifying the passcode. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans selection:bg-teal-500/30">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#06090e] flex-col items-center justify-center p-12 relative overflow-hidden border-r border-slate-200">
        {/* Universal Ambient Backgrounds */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 z-50 shadow-[0_0_20px_rgba(20,184,166,0.5)]" />
        <div className="absolute -top-[30%] -left-[10%] w-[100vw] h-[100vw] rounded-full bg-teal-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-[30%] -right-[10%] w-[80vw] h-[80vw] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-teal-500 border border-teal-400 flex items-center justify-center mx-auto mb-10 shadow-xl shadow-teal-500/30 relative">
            <Mic className="w-12 h-12 text-white relative z-10" />
          </div>
          
          <h1 className="text-5xl font-black mb-4 leading-[1.1] tracking-tight text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-200 drop-shadow-sm">Alpha LC</span><br />
            <span className="font-light text-slate-300">Exam Platform</span>
          </h1>
          
          <p className="text-slate-400 text-lg leading-relaxed mb-12">
            AI-powered CEFR examination.<br />
            Fast, accurate, and detailed results.
          </p>

          {/* Feature pills */}
          <div className="space-y-4 text-left">
            {[
              { icon: Mic, text: 'Real-time audio recording', color: 'text-sky-400', shadow: 'shadow-sky-500/20' },
              { icon: BrainCircuit, text: 'AI-powered evaluation', color: 'text-violet-400', shadow: 'shadow-violet-500/20' },
              { icon: BarChart, text: 'Detailed CEFR level results', color: 'text-emerald-400', shadow: 'shadow-emerald-500/20' },
              { icon: Zap, text: 'Instant results and insights', color: 'text-amber-400', shadow: 'shadow-amber-500/20' },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-4 bg-white/[0.03] border border-white/5 backdrop-blur-md rounded-2xl px-5 py-4 shadow-lg hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group cursor-default"
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-lg ${f.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <span className="text-slate-200 font-medium text-sm md:text-base">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative z-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-4 mb-10 lg:hidden justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg relative">
              <Mic className="w-6 h-6 text-teal-400 relative z-10" />
            </div>
            <div>
              <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500 text-2xl leading-none tracking-tight">Alpha LC</p>
              <p className="text-sm text-slate-500 mt-1 font-medium">Exam Platform</p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 md:p-10 relative overflow-hidden group">
            <div className="mb-8 relative z-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Login</h2>
              <p className="text-slate-500 text-sm">
                Enter your details to start the exam.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10" id="student-login-form">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="E.g., John Doe"
                    className="pl-10 h-11 rounded-xl focus-visible:ring-teal-500 uppercase transition-colors"
                    style={{
                      backgroundColor: fullName ? '#0f172a' : '#f8fafc',
                      color: fullName ? '#ffffff' : '#0f172a',
                      borderColor: fullName ? '#1e293b' : '#e2e8f0'
                    }}
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
                    placeholder="E.g., Morning Group"
                    className="pl-10 h-11 rounded-xl focus-visible:ring-teal-500 uppercase transition-colors"
                    style={{
                      backgroundColor: groupName ? '#0f172a' : '#f8fafc',
                      color: groupName ? '#ffffff' : '#0f172a',
                      borderColor: groupName ? '#1e293b' : '#e2e8f0'
                    }}
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
                    placeholder="E.g., Ms. Sarah Johnson"
                    className="pl-10 h-11 rounded-xl focus-visible:ring-teal-500 uppercase transition-colors"
                    style={{
                      backgroundColor: teacherName ? '#0f172a' : '#f8fafc',
                      color: teacherName ? '#ffffff' : '#0f172a',
                      borderColor: teacherName ? '#1e293b' : '#e2e8f0'
                    }}
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
                    placeholder="Enter passcode"
                    className="pl-10 pr-10 h-11 rounded-xl focus-visible:ring-teal-500 uppercase transition-colors"
                    style={{
                      backgroundColor: passcode ? '#0f172a' : '#f8fafc',
                      color: passcode ? '#ffffff' : '#0f172a',
                      borderColor: passcode ? '#1e293b' : '#e2e8f0'
                    }}
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
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 flex items-start gap-3">
                  <span className="mt-0.5 text-lg">⚠️</span>
                  <span className="leading-snug">{authError}</span>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-500/30 transition-all duration-300"
                  id="login-btn"
                >  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Start Exam
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Admin link & Footer */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-slate-500">
              Are you a teacher?{' '}
              <a href="/admin" className="text-teal-600 hover:text-teal-500 font-semibold underline-offset-4 hover:underline transition-colors">
                Admin Panel →
              </a>
            </p>
            <div className="text-xs text-slate-400 font-medium tracking-wide">
              Powered by <a href="https://instagram.com/baxramovv.21" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 transition-colors">@baxramovv.21</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

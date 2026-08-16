'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LayoutDashboard, Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

// Demo credentials
const ADMIN_EMAIL = 'admin@lcalpha.uz';
const ADMIN_PASSWORD = 'admin123';

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setAuthError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password })
      });

      if (res.ok) {
        // Success - cookies are set automatically
        router.push('/admin/dashboard');
      } else {
        const errorData = await res.json();
        setAuthError(errorData.error || 'Invalid credentials. Use the demo credentials below.');
      }
    } catch (err) {
      setAuthError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500/5" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">LC Alpha</h1>
          <p className="text-slate-400 text-sm mt-1">Examiner Dashboard</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6">Admin Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="admin-login-form">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-sm font-medium text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@lcalpha.uz"
                  className="pl-10 h-11 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-teal-500"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-sm font-medium text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="admin-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-teal-500"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Auth error */}
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                {authError}
              </div>
            )}

            {/* Demo credentials hint */}
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 text-xs text-teal-300 space-y-1">
              <p><strong>Demo email:</strong> admin@lcalpha.uz</p>
              <p><strong>Demo password:</strong> admin123</p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold gap-2 shadow-lg shadow-teal-500/20"
              id="admin-signin-btn"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Student?{' '}
          <a href="/" className="text-teal-500 hover:text-teal-400">
            Go to exam entry →
          </a>
        </p>
      </div>
    </div>
  );
}

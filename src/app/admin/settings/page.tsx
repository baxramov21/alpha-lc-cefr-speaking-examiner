'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Key, Lock, Loader2, Edit2, Save, Brain, Clock, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasscodeEntry } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function AdminSettingsPage() {
  // Auth Settings State
  const [studentPassword, setStudentPassword] = useState('ALPHA2024');
  const [allowSkip, setAllowSkip] = useState(true);
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');

  // Telegram Config State
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // AI Model Config State
  const [partModel, setPartModel] = useState('gemini-3.5-flash-lite');
  const [finalModel, setFinalModel] = useState('gemini-3.5-flash');
  const [writingTime, setWritingTime] = useState(60);
  const [readingTime, setReadingTime] = useState(60);
  const [listeningReps, setListeningReps] = useState(2);
  const [fullExamModeEnabled, setFullExamModeEnabled] = useState(false);
  const [fullExamSequence, setFullExamSequence] = useState<string[]>(['speaking', 'listening', 'reading', 'writing']);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchAuthSettings();
    fetchModelConfig();
    fetchTelegramConfig();
  }, []);

  const fetchTelegramConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings/telegram');
      if (res.ok) {
        const data = await res.json();
        setTelegramBotToken(data.telegram_bot_token || '');
        setTelegramChatId(data.telegram_chat_id || '');
      }
    } catch (err) {
      console.error('Failed to fetch telegram config', err);
    }
  };

  const handleSaveTelegramConfig = async () => {
    setTelegramStatus('loading');
    try {
      const res = await fetch('/api/admin/settings/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegram_bot_token: telegramBotToken, 
          telegram_chat_id: telegramChatId 
        })
      });
      if (res.ok) {
        setTelegramStatus('success');
        setTimeout(() => setTelegramStatus('idle'), 3000);
      } else {
        throw new Error('Failed');
      }
    } catch (err) {
      setTelegramStatus('error');
      setTimeout(() => setTelegramStatus('idle'), 3000);
    }
  };

  const fetchModelConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings/models');
      if (res.ok) {
        const data = await res.json();
        setPartModel(data.part_model || 'gemini-3.5-flash-lite');
        setFinalModel(data.final_model || 'gemini-3.5-flash');
        setWritingTime(data.writing_time_minutes || 60);
        setReadingTime(data.reading_time_minutes || 60);
        setListeningReps(data.listening_repetitions || 2);
        setFullExamModeEnabled(data.full_exam_mode_enabled ?? false);
        setFullExamSequence(data.full_exam_sequence || ['speaking', 'listening', 'reading', 'writing']);
      }
    } catch (err) {
      console.error('Failed to fetch model config', err);
    }
  };

  const handleSaveModelConfig = async () => {
    setModelStatus('loading');
    try {
      const res = await fetch('/api/admin/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          part_model: partModel, 
          final_model: finalModel,
          writing_time_minutes: writingTime,
          reading_time_minutes: readingTime,
          listening_repetitions: listeningReps,
          full_exam_mode_enabled: fullExamModeEnabled,
          full_exam_sequence: fullExamSequence
        })
      });
      if (res.ok) {
        setModelStatus('success');
        setTimeout(() => setModelStatus('idle'), 3000);
      } else {
        throw new Error('Failed');
      }
    } catch (err) {
      setModelStatus('error');
      setTimeout(() => setModelStatus('idle'), 3000);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const el = document.getElementById(`seq-item-${id}`);
      if (el) el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedItem(null);
    const el = document.getElementById(`seq-item-${id}`);
    if (el) el.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === id) return;

    const newSequence = [...fullExamSequence];
    const draggedIndex = newSequence.indexOf(draggedItem);
    const hoverIndex = newSequence.indexOf(id);
    
    newSequence.splice(draggedIndex, 1);
    newSequence.splice(hoverIndex, 0, draggedItem);
    setFullExamSequence(newSequence);
  };

  const fetchAuthSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/auth');
      if (res.ok) {
        const data = await res.json();
        setStudentPassword(data.student_password || 'ALPHA2024');
        setAllowSkip(data.allow_skip ?? true);
      }
    } catch (err) {
      console.error('Failed to fetch auth settings', err);
    }
  };

  const handleSaveAuthSettings = async () => {
    setAuthStatus('loading');
    try {
      const res = await fetch('/api/admin/settings/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student_password: studentPassword,
          allow_skip: allowSkip
        })
      });
      if (res.ok) {
        setAuthStatus('success');
        setTimeout(() => setAuthStatus('idle'), 3000);
      } else {
        throw new Error('Failed');
      }
    } catch (err) {
      setAuthStatus('error');
      setTimeout(() => setAuthStatus('idle'), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match!");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (!newPassword.trim() || !currentPassword.trim()) return;

    setPasswordStatus('loading');
    setPasswordError('');

    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (err: any) {
      setPasswordStatus('error');
      setPasswordError(err.message || 'An error occurred');
      setTimeout(() => setPasswordStatus('idle'), 4000);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage student passcodes and administrator credentials.
        </p>
      </div>

      {/* Exam Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8 relative overflow-hidden group mb-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Exam Configuration</h2>
            <p className="text-sm text-slate-500">Configure timings and repetitions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-3">
            <Label className="text-slate-700 font-bold">Writing Duration (minutes)</Label>
            <div className="relative">
              <Input 
                type="number"
                value={writingTime} 
                onChange={(e) => setWritingTime(Number(e.target.value))}
                className="rounded-xl border-slate-200 h-12 text-slate-700 font-medium bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-bold">Listening Audio Repetitions</Label>
            <div className="relative">
              <Input 
                type="number"
                value={listeningReps} 
                onChange={(e) => setListeningReps(Number(e.target.value))}
                className="rounded-xl border-slate-200 h-12 text-slate-700 font-medium bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-bold">Reading Duration (minutes)</Label>
            <div className="relative">
              <Input 
                type="number"
                value={readingTime} 
                onChange={(e) => setReadingTime(Number(e.target.value))}
                className="rounded-xl border-slate-200 h-12 text-slate-700 font-medium bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="text-slate-800 font-bold text-lg">Full Exam Sequence</Label>
              <p className="text-sm text-slate-500">Allow students to take all modules in one continuous flow.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={fullExamModeEnabled} onChange={(e) => setFullExamModeEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>
          
          {fullExamModeEnabled && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-4">
              <Label className="text-slate-700 font-bold text-base">Sequence Order</Label>
              <p className="text-xs text-slate-500 mb-4">Drag and drop modules to reorder them.</p>
              
              <div className="space-y-2">
                {fullExamSequence.map((mod) => (
                  <div
                    key={mod}
                    id={`seq-item-${mod}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, mod)}
                    onDragEnd={(e) => handleDragEnd(e, mod)}
                    onDragOver={(e) => handleDragOver(e, mod)}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-300 shadow-sm transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="text-slate-400 w-5 h-5" />
                      <span className="font-semibold text-slate-700 capitalize">{mod}</span>
                    </div>
                    <button 
                      onClick={() => setFullExamSequence(fullExamSequence.filter(m => m !== mod))} 
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {fullExamSequence.length === 0 && (
                  <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500 text-sm">
                    No modules selected. Add them below.
                  </div>
                )}
              </div>

              {/* Missing modules */}
              {['speaking', 'listening', 'reading', 'writing'].filter(m => !fullExamSequence.includes(m)).length > 0 && (
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Module</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {['speaking', 'listening', 'reading', 'writing']
                      .filter(m => !fullExamSequence.includes(m))
                      .map(m => (
                        <button 
                          key={m} 
                          onClick={() => setFullExamSequence([...fullExamSequence, m])}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-600 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> <span className="capitalize">{m}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">Save these configurations to apply them globally.</p>
          <Button
            onClick={handleSaveModelConfig}
            disabled={modelStatus === 'loading'}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-2 shadow-lg shadow-amber-500/20"
          >
            {modelStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* ---- Universal Access Settings ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Key className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Universal Student Access</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage the master password and exam capabilities
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveAuthSettings}
            disabled={authStatus === 'loading'}
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 shadow-lg shadow-teal-600/20"
          >
            {authStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Access Settings
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-slate-700 font-bold">Universal Student Password</Label>
            <div className="relative">
              <Input 
                type="text"
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value.toUpperCase())}
                className="rounded-xl border-slate-200 h-12 text-slate-700 font-bold font-mono tracking-widest bg-slate-50 focus:bg-white uppercase"
              />
            </div>
            <p className="text-xs text-slate-500">Students will use this to enter the exam.</p>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-bold">Allow Skipping Questions</Label>
            <div className="flex items-center gap-3 h-12">
              <button
                onClick={() => setAllowSkip(!allowSkip)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  allowSkip ? 'bg-teal-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    allowSkip ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-slate-600">
                {allowSkip ? 'Enabled (Students can skip prep/questions)' : 'Disabled (Forced to wait)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Telegram Audio Dispatch ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Telegram Audio Dispatching</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically send speaking audio recordings to a Telegram chat.
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveTelegramConfig}
            disabled={telegramStatus === 'loading'}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl gap-2 shadow-lg shadow-blue-500/20"
          >
            {telegramStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Telegram Settings
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-slate-700 font-bold">Bot Token</Label>
            <div className="relative">
              <Input 
                type="text"
                placeholder="123456789:ABCdefGHIjkl..."
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                className="rounded-xl border-slate-200 h-12 text-slate-700 bg-slate-50 focus:bg-white"
              />
            </div>
            <p className="text-xs text-slate-500">The token from BotFather.</p>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-bold">Chat ID</Label>
            <div className="relative">
              <Input 
                type="text"
                placeholder="-1001234567890"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="rounded-xl border-slate-200 h-12 text-slate-700 bg-slate-50 focus:bg-white"
              />
            </div>
            <p className="text-xs text-slate-500">The channel, group, or user ID.</p>
          </div>
        </div>
      </div>

      {/* ---- Admin Password Change ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <Lock className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Admin Password</h2>
            <p className="text-xs text-muted-foreground">Change your administrator login password</p>
          </div>
        </div>
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 rounded-xl text-sm"
            />
          </div>

          {passwordError && (
            <p className="text-red-500 text-xs font-medium">{passwordError}</p>
          )}
          
          <Button
            onClick={handleChangePassword}
            disabled={passwordStatus === 'loading'}
            className={`gap-2 rounded-xl h-11 px-6 transition-all ${
              passwordStatus === 'success'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {passwordStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {passwordStatus === 'success' ? 'Password Updated!' : 'Update Password'}
          </Button>
        </div>
      </div>

      {/* ---- AI Model Configuration ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">AI Model Configuration</h2>
            <p className="text-xs text-muted-foreground">Select active Gemini models for evaluation</p>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Part Evaluator (Audio parts, high volume)</Label>
            <select
              value={partModel}
              onChange={(e) => setPartModel(e.target.value)}
              className="w-full h-10 rounded-xl text-sm border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
            >
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
              <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Final Evaluator (Aggregation & Writing)</Label>
            <select
              value={finalModel}
              onChange={(e) => setFinalModel(e.target.value)}
              className="w-full h-10 rounded-xl text-sm border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
            >
              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            </select>
          </div>

          <Button
            onClick={handleSaveModelConfig}
            disabled={modelStatus === 'loading'}
            className={`gap-2 rounded-xl h-11 px-6 transition-all mt-2 ${
              modelStatus === 'success'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {modelStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {modelStatus === 'success' ? 'Models Updated!' : 'Save AI Models'}
          </Button>
        </div>
      </div>
    </div>
  );
}

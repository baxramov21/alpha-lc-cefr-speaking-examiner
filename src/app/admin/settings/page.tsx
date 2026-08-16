'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Key, Lock, Loader2, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasscodeEntry } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function AdminSettingsPage() {
  const [passcodes, setPasscodes] = useState<PasscodeEntry[]>([]);
  const [loadingPasscodes, setLoadingPasscodes] = useState(true);
  const [newPasscode, setNewPasscode] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({});
  
  // Edit Passcode State
  const [editingPasscodeId, setEditingPasscodeId] = useState<string | null>(null);
  const [editPasscodeValue, setEditPasscodeValue] = useState('');
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchPasscodes();
  }, []);

  const fetchPasscodes = async () => {
    setLoadingPasscodes(true);
    try {
      const res = await fetch('/api/admin/passcodes');
      const data = await res.json();
      if (data.passcodes) {
        setPasscodes(data.passcodes.map((d: any) => ({
          id: d.id,
          passcode: d.code,
          groupName: d.group_name,
          teacherName: d.teacher_name,
          isActive: d.is_active,
          createdAt: d.created_at
        })));
      }
    } catch (err) {
      console.error('Failed to fetch passcodes', err);
    }
    setLoadingPasscodes(false);
  };

  const startEditingPasscode = (id: string, currentCode: string) => {
    setEditingPasscodeId(id);
    setEditPasscodeValue(currentCode);
  };

  const saveEditedPasscode = async (id: string) => {
    if (!editPasscodeValue.trim() || editPasscodeValue.length < 4) {
      alert('Passcode must be at least 4 characters long.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/passcodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editPasscodeValue.trim() }),
      });

      if (!res.ok) throw new Error('Failed to update passcode');

      setPasscodes(prev => prev.map(p => 
        p.id === id ? { ...p, passcode: editPasscodeValue.trim() } : p
      ));
      setEditingPasscodeId(null);
      setEditPasscodeValue('');
    } catch (error) {
      console.error('Error saving edited passcode:', error);
      alert('Failed to update passcode');
    }
  };

  const toggleShow = (id: string) => setShowCodes((prev) => ({ ...prev, [id]: !prev[id] }));

  const addPasscode = async () => {
    if (!newPasscode.trim() || !newGroup.trim() || !newTeacher.trim()) return;
    const code = newPasscode.trim().toUpperCase();
    
    try {
      const res = await fetch('/api/admin/passcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          group_name: newGroup.trim(),
          teacher_name: newTeacher.trim(),
          is_active: true
        })
      });
      if (!res.ok) throw new Error('Failed');
    } catch (err) {
      alert('Failed to add passcode. It might already exist.');
      return;
    }

    setNewPasscode('');
    setNewGroup('');
    setNewTeacher('');
    fetchPasscodes();
  };

  const removePasscode = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/passcodes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPasscodes((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/admin/passcodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState })
      });
      if (res.ok) {
        setPasscodes((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: !currentState } : p))
        );
      }
    } catch (err) {
      console.error(err);
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

      {/* ---- Passcode Management ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
            <Key className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Student Passcodes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {passcodes.filter((p) => p.isActive).length} active passcodes
            </p>
          </div>
        </div>

        {/* Add new */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Add New Passcode</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Passcode</Label>
              <Input
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value.toUpperCase())}
                placeholder="e.g. GROUP01"
                className="h-9 rounded-lg text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Group Name</Label>
              <Input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="e.g. Group E"
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Teacher Name</Label>
              <Input
                value={newTeacher}
                onChange={(e) => setNewTeacher(e.target.value)}
                placeholder="e.g. Mr. Karimov"
                className="h-9 rounded-lg text-sm"
              />
            </div>
          </div>
          <Button
            onClick={addPasscode}
            size="sm"
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Passcode
          </Button>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-50">
          {loadingPasscodes ? (
            <div className="p-10 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : passcodes.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              No passcodes found. Add one above.
            </div>
          ) : passcodes.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${!p.isActive ? 'opacity-50 bg-slate-50' : ''}`}
            >
              {/* Code */}
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                {editingPasscodeId === p.id ? (
                  <Input
                    autoFocus
                    value={editPasscodeValue}
                    onChange={(e) => setEditPasscodeValue(e.target.value)}
                    className="h-8 text-xs font-mono font-bold w-full"
                    placeholder="New code"
                  />
                ) : (
                  <>
                    <code className="text-sm font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                      {showCodes[p.id] ? p.passcode : '••••••'}
                    </code>
                    <button
                      onClick={() => toggleShow(p.id)}
                      className="text-muted-foreground hover:text-slate-600 transition-colors"
                    >
                      {showCodes[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{p.groupName}</p>
                <p className="text-xs text-muted-foreground truncate">{p.teacherName}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Save or Edit */}
                {editingPasscodeId === p.id ? (
                  <button
                    onClick={() => saveEditedPasscode(p.id)}
                    className="text-emerald-600 hover:text-emerald-700 transition-colors p-1"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => startEditingPasscode(p.id, p.passcode)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {/* Status toggle */}
                <button
                  onClick={() => toggleActive(p.id, p.isActive)}
                  className={`text-xs font-medium px-2 py-1 rounded-full border transition-colors ${
                    p.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                  }`}
                >
                  {p.isActive ? 'Active' : 'Disabled'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => removePasscode(p.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
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
    </div>
  );
}

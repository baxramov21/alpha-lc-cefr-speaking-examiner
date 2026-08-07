'use client';

import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, Key, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MOCK_PASSCODES } from '@/lib/mockPasscodes';
import { PasscodeEntry } from '@/lib/types';

export default function AdminSettingsPage() {
  const [passcodes, setPasscodes] = useState<PasscodeEntry[]>(MOCK_PASSCODES);
  const [newPasscode, setNewPasscode] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const toggleShow = (id: string) => setShowCodes((prev) => ({ ...prev, [id]: !prev[id] }));

  const addPasscode = () => {
    if (!newPasscode.trim() || !newGroup.trim() || !newTeacher.trim()) return;
    const entry: PasscodeEntry = {
      id: `pc-${Date.now()}`,
      passcode: newPasscode.trim().toUpperCase(),
      groupName: newGroup.trim(),
      teacherName: newTeacher.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setPasscodes((prev) => [...prev, entry]);
    setNewPasscode('');
    setNewGroup('');
    setNewTeacher('');
  };

  const removePasscode = (id: string) => {
    setPasscodes((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleActive = (id: string) => {
    setPasscodes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage student passcodes, exam configuration, and API settings.
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
                id="new-passcode-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Group Name</Label>
              <Input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="e.g. Group E"
                className="h-9 rounded-lg text-sm"
                id="new-group-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Teacher Name</Label>
              <Input
                value={newTeacher}
                onChange={(e) => setNewTeacher(e.target.value)}
                placeholder="e.g. Mr. Karimov"
                className="h-9 rounded-lg text-sm"
                id="new-teacher-input"
              />
            </div>
          </div>
          <Button
            onClick={addPasscode}
            size="sm"
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg gap-1.5"
            id="add-passcode-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Add Passcode
          </Button>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-50">
          {passcodes.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${!p.isActive ? 'opacity-50 bg-slate-50' : ''}`}
            >
              {/* Code */}
              <div className="flex items-center gap-2 w-28 flex-shrink-0">
                <code className="text-sm font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                  {showCodes[p.id] ? p.passcode : '••••••'}
                </code>
                <button
                  onClick={() => toggleShow(p.id)}
                  className="text-muted-foreground hover:text-slate-600 transition-colors"
                >
                  {showCodes[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{p.groupName}</p>
                <p className="text-xs text-muted-foreground truncate">{p.teacherName}</p>
              </div>

              {/* Status toggle */}
              <button
                onClick={() => toggleActive(p.id)}
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
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---- API Key ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Gemini API Key</h2>
            <p className="text-xs text-muted-foreground">Used for AI scoring in Phase 4</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">API Key</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza…"
            className="h-10 rounded-xl font-mono text-sm"
            id="gemini-api-key-input"
          />
          <p className="text-xs text-muted-foreground">
            Get your key from{' '}
            <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-teal-600 underline-offset-2 hover:underline">
              Google AI Studio
            </a>
          </p>
        </div>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        className={`gap-2 rounded-xl h-11 px-6 transition-all ${
          saved
            ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
            : 'bg-teal-500 hover:bg-teal-600 text-white'
        }`}
        id="save-settings-btn"
      >
        <Save className="w-4 h-4" />
        {saved ? '✓ Saved!' : 'Save Changes'}
      </Button>
    </div>
  );
}

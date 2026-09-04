'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Shield, Loader2, CheckCircle2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PasscodesPage() {
  const [passcodes, setPasscodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Passcode Form State
  const [code, setCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [programme, setProgramme] = useState('CEFR');
  const [grammarLevel, setGrammarLevel] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchPasscodes = async () => {
    try {
      const res = await fetch('/api/admin/passcodes');
      if (res.ok) {
        const data = await res.json();
        setPasscodes(data.passcodes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPasscodes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !groupName || !teacherName) {
      setError('Code, Group Name, and Teacher Name are required.');
      return;
    }
    if (programme === 'GRAMMAR' && !grammarLevel) {
      setError('Grammar Level is required for Grammar programme.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const payload = {
        code,
        group_name: groupName,
        teacher_name: teacherName,
        programme,
        grammar_level: programme === 'GRAMMAR' ? grammarLevel : undefined,
      };

      const res = await fetch('/api/admin/passcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create passcode');

      setSuccess(true);
      setCode('');
      setGroupName('');
      setTeacherName('');
      setTimeout(() => setSuccess(false), 3000);
      fetchPasscodes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/passcodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) fetchPasscodes();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-800">Access Passcodes</h1>
        <p className="text-slate-500 mt-1">Manage unique passcodes for classes and teachers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> Create New Passcode
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Passcode</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MON1800"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Group / Class Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. IELTS 7.0 Group"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Teacher Name</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Programme</label>
                <select
                  value={programme}
                  onChange={(e) => {
                    setProgramme(e.target.value);
                    if (e.target.value !== 'GRAMMAR') setGrammarLevel('');
                  }}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors appearance-none"
                >
                  <option value="CEFR">CEFR</option>
                  <option value="IELTS">IELTS</option>
                  <option value="GRAMMAR">Grammar</option>
                </select>
              </div>

              {programme === 'GRAMMAR' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Grammar Level</label>
                  <select
                    value={grammarLevel}
                    onChange={(e) => setGrammarLevel(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors appearance-none"
                  >
                    <option value="">Select level...</option>
                    <option value="elementary">Elementary</option>
                    <option value="pre-intermediate">Pre-Intermediate</option>
                    <option value="intermediate">Intermediate</option>
                  </select>
                </div>
              )}

              {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}
              {success && <p className="text-emerald-500 text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Created successfully!</p>}

              <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 font-bold">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Passcode'}
              </Button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" />
              <h2 className="font-bold text-slate-800">Active Passcodes</h2>
            </div>
            
            {isLoading ? (
              <div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
            ) : passcodes.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No passcodes found.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passcodes.map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-slate-800 text-lg tracking-wider">{p.code}</div>
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{p.group_name}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" /> {p.teacher_name}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">{p.programme}</span>
                          {p.grammar_level && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100 capitalize">{p.grammar_level}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          onClick={() => toggleStatus(p.id, p.is_active)}
                          variant="outline" 
                          size="sm"
                          className={p.is_active ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200'}
                        >
                          {p.is_active ? <PowerOff className="w-4 h-4 mr-1.5" /> : <Power className="w-4 h-4 mr-1.5" />}
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

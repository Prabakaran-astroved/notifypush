import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Key, Server, User, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSystemSettings, updateProfile } from '../api/authApi';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile update form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSystemSettings();
        if (res.data.success) {
          setSettings(res.data.settings);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setProfileSaving(true);

    try {
      const res = await updateProfile({
        name,
        email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });

      if (res.data.success) {
        setUser(res.data.user);
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System & Account Settings</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your administrator profile, view Webpushr API gateway status, and queue parameters.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Admin Account Profile</h3>
          </div>

          {profileMsg.text && (
            <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              profileMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-600 block mb-2">Change Password (Optional)</span>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showCurrentPw ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="New Password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showNewPw ? 'Hide password' : 'Show password'}
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition shadow-sm"
              >
                {profileSaving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* System & Webpushr Credentials Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Key className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Webpushr Gateway Configuration</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">REST API Key</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Connected</span>
              </div>
              <p className="font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 text-[11px]">
                {settings?.webpushr?.apiKeyMasked || '••••••••••••••••'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Auth Token</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Connected</span>
              </div>
              <p className="font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 text-[11px]">
                {settings?.webpushr?.authTokenMasked || '••••••••'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 flex items-center">
                <Server className="w-3.5 h-3.5 text-slate-500 mr-1" />
                Queue & Worker Tuning
              </span>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[11px]">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Concurrency</div>
                  <div className="font-bold text-slate-800">{settings?.queue?.concurrency || 5} workers</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Max Retries</div>
                  <div className="font-bold text-slate-800">{settings?.queue?.maxRetries || 3} attempts</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Rate Limit Delay</div>
                  <div className="font-bold text-slate-800">{settings?.queue?.rateLimitDelayMs || 200} ms</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                Production API credentials are securely managed in the server environment (<code>backend/.env</code>).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

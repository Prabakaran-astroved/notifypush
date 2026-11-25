import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Key, 
  Server, 
  User, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Edit3, 
  UserCheck, 
  UserX,
  Lock,
  Send,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSystemSettings, updateProfile, getUsers, createUser, updateUser, deleteUser } from '../api/authApi';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'users' | 'config'
  const [settings, setSettings] = useState(null);

  // Profile update state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // User Management state (for Super Admin)
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    status: 'active',
    permissions: {
      canSendNotifications: true,
      canCreateCampaigns: true,
      canExportReports: true,
      canDelete: false
    }
  });
  const [userModalMsg, setUserModalMsg] = useState({ type: '', text: '' });
  const [userSaving, setUserSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      const res = await getSystemSettings();
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await getUsers();
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

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

  // Open User Modal (Create / Edit)
  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'admin',
      status: 'active',
      permissions: {
        canSendNotifications: true,
        canCreateCampaigns: true,
        canExportReports: true,
        canDelete: false
      }
    });
    setUserModalMsg({ type: '', text: '' });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (targetUser) => {
    setEditingUserId(targetUser._id);
    setUserFormData({
      name: targetUser.name,
      email: targetUser.email,
      password: '',
      role: targetUser.role,
      status: targetUser.status,
      permissions: {
        canSendNotifications: targetUser.permissions?.canSendNotifications !== false,
        canCreateCampaigns: targetUser.permissions?.canCreateCampaigns !== false,
        canExportReports: targetUser.permissions?.canExportReports !== false,
        canDelete: !!targetUser.permissions?.canDelete
      }
    });
    setUserModalMsg({ type: '', text: '' });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserModalMsg({ type: '', text: '' });
    setUserSaving(true);

    try {
      if (editingUserId) {
        await updateUser(editingUserId, userFormData);
      } else {
        await createUser(userFormData);
      }
      setUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      setUserModalMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save user' });
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.role === 'superadmin') {
      alert('Cannot delete a Super Admin account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${targetUser.name}" (${targetUser.email})?`)) {
      return;
    }

    try {
      await deleteUser(targetUser._id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System & Account Settings</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isSuperAdmin ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  {user?.role || 'admin'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage your credentials, team users, permissions, and Webpushr gateway settings.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Profile
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
                  activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users & Permissions</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'config' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gateway & Queue
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: My Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Assigned Permissions Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Your System Permissions</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Dispatch Push Notifications</div>
                  <div className="text-[11px] text-slate-500">Allowed to send push notifications via SID and Segments</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Granted</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Create & Edit Campaigns</div>
                  <div className="text-[11px] text-slate-500">Allowed to upload Excel subscriber lists and draft campaigns</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Granted</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Export Reports</div>
                  <div className="text-[11px] text-slate-500">Allowed to download Excel reports for sent/failed subscribers</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Granted</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Delete Campaigns & Logs</div>
                  <div className="text-[11px] text-slate-500">Permission to permanently delete campaign drafts and queue history</div>
                </div>
                {isSuperAdmin || user?.permissions?.canDelete ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Granted (Super Admin)</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Restricted</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users & Permissions (Super Admin Only) */}
      {activeTab === 'users' && isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">PushHub Users & Role Permissions</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Super Admin can create new users, assign roles, and grant or restrict specific permissions.
              </p>
            </div>
            <button
              onClick={handleOpenCreateUser}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create New User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Send Push</th>
                  <th className="py-3 px-4">Create Campaign</th>
                  <th className="py-3 px-4">Export Excel</th>
                  <th className="py-3 px-4">Delete Records</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usersLoading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">Loading user accounts...</td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">No users found.</td>
                  </tr>
                ) : (
                  usersList.map((u) => {
                    const isSuper = u.role === 'superadmin';
                    return (
                      <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isSuper ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600">Yes</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600">Yes</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600">Yes</td>
                        <td className="py-3.5 px-4">
                          {isSuper || u.permissions?.canDelete ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Allowed</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Restricted</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Permissions"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {!isSuper && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Gateway Configuration */}
      {activeTab === 'config' && (
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
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit User */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {editingUserId ? 'Edit User Permissions' : 'Create New User Account'}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-white/80 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              {userModalMsg.text && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{userModalMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. John Marketing"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="user@astroved.com"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingUserId ? 'Password (Leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="admin">Admin / User</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Specific Permissions */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Grant / Restrict Permissions
                </span>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormData.permissions.canSendNotifications}
                    onChange={(e) => setUserFormData({
                      ...userFormData,
                      permissions: { ...userFormData.permissions, canSendNotifications: e.target.checked }
                    })}
                    className="w-4 h-4 text-orange-500 rounded border-slate-300"
                  />
                  <span className="text-slate-700 font-medium">Can Send Push Notifications (SID / Segment)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormData.permissions.canCreateCampaigns}
                    onChange={(e) => setUserFormData({
                      ...userFormData,
                      permissions: { ...userFormData.permissions, canCreateCampaigns: e.target.checked }
                    })}
                    className="w-4 h-4 text-orange-500 rounded border-slate-300"
                  />
                  <span className="text-slate-700 font-medium">Can Create & Upload Campaigns</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormData.permissions.canExportReports}
                    onChange={(e) => setUserFormData({
                      ...userFormData,
                      permissions: { ...userFormData.permissions, canExportReports: e.target.checked }
                    })}
                    className="w-4 h-4 text-orange-500 rounded border-slate-300"
                  />
                  <span className="text-slate-700 font-medium">Can Export Excel Reports</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer pt-1 border-t border-slate-200">
                  <input
                    type="checkbox"
                    disabled={userFormData.role === 'superadmin'}
                    checked={userFormData.role === 'superadmin' || userFormData.permissions.canDelete}
                    onChange={(e) => setUserFormData({
                      ...userFormData,
                      permissions: { ...userFormData.permissions, canDelete: e.target.checked }
                    })}
                    className="w-4 h-4 text-rose-500 rounded border-slate-300"
                  />
                  <span className="text-rose-700 font-bold">
                    Can Delete Drafts & History {userFormData.role !== 'superadmin' ? '(Default: Restricted)' : ''}
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userSaving}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-sm"
                >
                  {userSaving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

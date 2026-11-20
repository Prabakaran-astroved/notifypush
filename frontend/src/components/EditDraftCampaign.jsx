import React, { useState } from 'react';
import { ArrowLeft, Save, XCircle } from 'lucide-react';
import { updateDraftCampaign } from '../api/campaignApi';

export default function EditDraftCampaign({ campaign, onCancel, onSavedSuccess }) {
  const [campaignName, setCampaignName] = useState(campaign?.campaignName || '');

  // Parse existing expire_push like "5d", "12h", "30m"
  const existingExpire = campaign?.notification?.expire_push || '';
  const match = existingExpire.match(/^(\d+)([dhm])$/i);
  const initialDuration = match ? parseInt(match[1], 10) : 1;
  const initialUnit = match ? match[2].toLowerCase() : 'd';
  const initialEnabled = !!existingExpire;

  const [notification, setNotification] = useState({
    title: campaign?.notification?.title || '',
    message: campaign?.notification?.message || '',
    target_url: campaign?.notification?.target_url || '',
    icon: campaign?.notification?.icon || '',
    expire_push: campaign?.notification?.expire_push || '1d',
    expire_push_enabled: initialEnabled,
    expire_push_duration: initialDuration,
    expire_push_unit: initialUnit,
    auto_hide: Boolean(campaign?.notification?.auto_hide),
    send_at: campaign?.notification?.send_at ? new Date(campaign.notification.send_at).toISOString().slice(0, 16) : '',
    action_buttons: campaign?.notification?.action_buttons || []
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setErrorMsg('Campaign Name is required');
      return;
    }
    if (!notification.title.trim() || !notification.message.trim() || !notification.target_url.trim()) {
      setErrorMsg('Title, Message, and Target URL are required');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await updateDraftCampaign(campaign._id, {
        campaignName,
        notification
      });
      if (res.data.success) {
        onSavedSuccess(res.data.campaign);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update draft campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Draft Campaign</h2>
            <p className="text-xs text-slate-500">Update campaign settings and notification payload</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">Campaign Name</label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">Title</label>
            <input
              type="text"
              maxLength={100}
              value={notification.title}
              onChange={(e) => setNotification({ ...notification, title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">Target URL</label>
            <input
              type="url"
              maxLength={255}
              value={notification.target_url}
              onChange={(e) => setNotification({ ...notification, target_url: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">Message</label>
          <textarea
            rows={3}
            maxLength={255}
            value={notification.message}
            onChange={(e) => setNotification({ ...notification, message: e.target.value })}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">Icon URL</label>
            <input
              type="url"
              value={notification.icon}
              onChange={(e) => setNotification({ ...notification, icon: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">Auto Hide</label>
            <select
              value={notification.auto_hide ? 'true' : 'false'}
              onChange={(e) => setNotification({ ...notification, auto_hide: e.target.value === 'true' })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
            >
              <option value="false">False</option>
              <option value="true">True</option>
            </select>
          </div>
        </div>

        {/* Expire Push Automatically */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-4">
              <p className="text-sm font-bold text-slate-800">Expire Push Automatically</p>
              <p className="text-xs text-slate-500">Notifications will not show after a specified time.</p>
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Enable:</label>
              <select
                value={notification.expire_push_enabled ? 'true' : 'false'}
                onChange={(e) => {
                  const enabled = e.target.value === 'true';
                  setNotification({
                    ...notification,
                    expire_push_enabled: enabled,
                    expire_push: enabled ? `${notification.expire_push_duration || 1}${notification.expire_push_unit || 'd'}` : ''
                  });
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Length In Time:</label>
              <input
                type="number"
                min={1}
                disabled={!notification.expire_push_enabled}
                value={notification.expire_push_duration}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setNotification({
                    ...notification,
                    expire_push_duration: val,
                    expire_push: `${val}${notification.expire_push_unit}`
                  });
                }}
                className="w-full px-3 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">&nbsp;</label>
              <select
                disabled={!notification.expire_push_enabled}
                value={notification.expire_push_unit}
                onChange={(e) => {
                  const unit = e.target.value;
                  setNotification({
                    ...notification,
                    expire_push_unit: unit,
                    expire_push: `${notification.expire_push_duration}${unit}`
                  });
                }}
                className="w-full px-3 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500"
              >
                <option value="d">Days</option>
                <option value="h">Hours</option>
                <option value="m">Minutes</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold flex items-center shadow-md shadow-orange-500/20"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

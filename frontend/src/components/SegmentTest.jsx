import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Plus, 
  Trash2, 
  Sparkles,
  UserCheck,
  Clock,
  Calendar,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { sendSegmentNotification, sendSidTestNotification, getTestLogs } from '../api/campaignApi';

export default function SegmentTest() {
  const [activeTab, setActiveTab] = useState('segment'); // 'segment' | 'sid'

  // Shared / Tab form states
  const [segmentData, setSegmentData] = useState({
    name: 'Segment Push Campaign Test',
    segment: '',
    title: 'AstroVed Special Offer',
    message: 'Check out your special Vedic astrology offer for today!',
    target_url: 'https://www.astroved.com',
    icon: 'https://www.astroved.com/favicon.png',
    image: '',
    expire_push: '1d',
    expire_push_enabled: true,
    expire_push_duration: 1,
    expire_push_unit: 'd',
    auto_hide: true,
    send_at: '',
    action_buttons: []
  });

  const [sidData, setSidData] = useState({
    sid: '',
    title: 'AstroVed Personal Push Notification',
    message: 'Your personal Vedic astrology notification is here!',
    target_url: 'https://www.astroved.com',
    icon: 'https://www.astroved.com/favicon.png',
    expire_push: '1d',
    expire_push_enabled: true,
    expire_push_duration: 1,
    expire_push_unit: 'd',
    auto_hide: true,
    send_at: '',
    action_buttons: []
  });

  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // History & Scheduled Logs State
  const [testLogs, setTestLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch test logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await getTestLogs();
      if (res.data.success) {
        setTestLogs(res.data.logs);
      }
    } catch (e) {
      console.error('Failed to load test logs:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Handle action buttons for Segment & SID
  const handleAddButton = (type) => {
    if (type === 'segment') {
      if (segmentData.action_buttons.length >= 2) return;
      setSegmentData({
        ...segmentData,
        action_buttons: [...segmentData.action_buttons, { title: '', url: '' }]
      });
    } else {
      if (sidData.action_buttons.length >= 2) return;
      setSidData({
        ...sidData,
        action_buttons: [...sidData.action_buttons, { title: '', url: '' }]
      });
    }
  };

  const handleRemoveButton = (type, index) => {
    if (type === 'segment') {
      const updated = [...segmentData.action_buttons];
      updated.splice(index, 1);
      setSegmentData({ ...segmentData, action_buttons: updated });
    } else {
      const updated = [...sidData.action_buttons];
      updated.splice(index, 1);
      setSidData({ ...sidData, action_buttons: updated });
    }
  };

  const handleButtonChange = (type, index, field, value) => {
    if (type === 'segment') {
      const updated = [...segmentData.action_buttons];
      updated[index][field] = value;
      setSegmentData({ ...segmentData, action_buttons: updated });
    } else {
      const updated = [...sidData.action_buttons];
      updated[index][field] = value;
      setSidData({ ...sidData, action_buttons: updated });
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResponseResult(null);
    setLoading(true);

    try {
      if (activeTab === 'segment') {
        const rawSegments = segmentData.segment
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        if (rawSegments.length === 0) {
          setErrorMsg('Please specify at least one Segment ID (e.g. 10423, 10424)');
          setLoading(false);
          return;
        }

        if (segmentData.send_at) {
          const schedTime = new Date(segmentData.send_at).getTime();
          const minAllowed = Date.now() + 5 * 60 * 1000;
          if (schedTime < minAllowed) {
            setErrorMsg('Webpushr Schedule Error: Scheduled date/time must be at least 5 minutes in the future.');
            setLoading(false);
            return;
          }
        }

        const payload = {
          name: segmentData.name.trim(),
          segment: rawSegments,
          title: segmentData.title.trim(),
          message: segmentData.message.trim(),
          target_url: segmentData.target_url.trim(),
          icon: segmentData.icon.trim() || undefined,
          image: segmentData.image.trim() || undefined,
          expire_push: segmentData.expire_push_enabled ? `${segmentData.expire_push_duration}${segmentData.expire_push_unit}` : undefined,
          auto_hide: segmentData.auto_hide,
          send_at: segmentData.send_at || undefined,
          action_buttons: segmentData.action_buttons.filter(b => b.title && b.url)
        };

        const res = await sendSegmentNotification(payload);
        setResponseResult({
          type: 'Segment Push',
          success: true,
          statusCode: res.data.statusCode || 200,
          data: res.data.data,
          payload: res.data.payload
        });
        fetchLogs();
      } else {
        // Single Subscriber ID
        if (!sidData.sid.trim()) {
          setErrorMsg('Please enter a Subscriber ID (SID)');
          setLoading(false);
          return;
        }

        if (segmentData.send_at) {
          const schedTime = new Date(segmentData.send_at).getTime();
          const minAllowed = Date.now() + 5 * 60 * 1000;
          if (schedTime < minAllowed) {
            setErrorMsg('Webpushr Schedule Error: Scheduled date/time must be at least 5 minutes in the future.');
            setLoading(false);
            return;
          }
        }

        const payload = {
          sid: sidData.sid.trim(),
          title: sidData.title.trim(),
          message: sidData.message.trim(),
          target_url: sidData.target_url.trim(),
          icon: sidData.icon.trim() || undefined,
          expire_push: sidData.expire_push_enabled ? `${sidData.expire_push_duration}${sidData.expire_push_unit}` : undefined,
          auto_hide: sidData.auto_hide,
          send_at: sidData.send_at || undefined,
          action_buttons: sidData.action_buttons.filter(b => b.title && b.url)
        };

        const res = await sendSidTestNotification(payload);
        setResponseResult({
          type: 'Subscriber ID Push',
          success: true,
          statusCode: res.data.statusCode || 200,
          data: res.data.data,
          payload: res.data.payload
        });
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to send notification');
      if (err.response?.data) {
        setResponseResult({
          type: activeTab === 'segment' ? 'Segment Push' : 'Subscriber ID Push',
          success: false,
          statusCode: err.response.status,
          data: err.response.data.data || err.response.data,
          payload: err.response.data.payload
        });
      }
      fetchLogs();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold">
              {activeTab === 'segment' ? <Users className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Test Studio</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Send live test notifications to either a <strong>Webpushr Segment</strong> or a specific <strong>Subscriber ID</strong>.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab('segment'); setResponseResult(null); setErrorMsg(''); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === 'segment'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Test by Segment</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('sid'); setResponseResult(null); setErrorMsg(''); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === 'sid'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Test by Subscriber ID</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Notice */}
      {activeTab === 'segment' ? (
        <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-xs text-indigo-950 flex items-start space-x-3 shadow-sm">
          <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700 flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="leading-relaxed">
            <span className="font-bold">Webpushr Segment Endpoint (POST /v1/notification/send/segment): </span>
            Broadcasts to pre-defined groups created in your Webpushr dashboard. Supports both the <strong>icon</strong> and large <strong>banner image</strong> parameters.
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-950 flex items-start space-x-3 shadow-sm">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="leading-relaxed">
            <span className="font-bold">Webpushr Individual SID Endpoint (POST /v1/notification/send/sid): </span>
            Delivers a push notification to an individual user's Subscriber ID. <strong>Note:</strong> SID endpoints support the <strong>icon</strong> parameter (192×192 PNG), but do not support the large banner image.
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center space-x-3">
          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Target Destination */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <span className={`w-2.5 h-2.5 rounded-full ${activeTab === 'segment' ? 'bg-purple-500' : 'bg-orange-500'}`}></span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              1. {activeTab === 'segment' ? 'Target Segments' : 'Target Subscriber ID'}
            </h3>
          </div>

          {activeTab === 'segment' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Campaign Reporting Name (Optional)
                </label>
                <input
                  type="text"
                  value={segmentData.name}
                  onChange={(e) => setSegmentData({ ...segmentData, name: e.target.value })}
                  placeholder="e.g. Diwali Premium Segment Blast"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Segment ID(s) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={segmentData.segment}
                  onChange={(e) => setSegmentData({ ...segmentData, segment: e.target.value })}
                  placeholder="e.g. 10423 or comma-separated: 10423, 10424"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Found in your Webpushr Dashboard under <strong>Segments</strong>.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Subscriber ID (SID) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sidData.sid}
                onChange={(e) => setSidData({ ...sidData, sid: e.target.value })}
                placeholder="e.g. 123456789"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Enter an individual user's numeric Webpushr Subscriber ID (SID).
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Notification Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">2. Notification Details</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {activeTab === 'segment' ? segmentData.title.length : sidData.title.length}/100
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={100}
                value={activeTab === 'segment' ? segmentData.title : sidData.title}
                onChange={(e) => {
                  if (activeTab === 'segment') setSegmentData({ ...segmentData, title: e.target.value });
                  else setSidData({ ...sidData, title: e.target.value });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Message <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {activeTab === 'segment' ? segmentData.message.length : sidData.message.length}/255
                </span>
              </div>
              <textarea
                rows={3}
                required
                maxLength={255}
                value={activeTab === 'segment' ? segmentData.message : sidData.message}
                onChange={(e) => {
                  if (activeTab === 'segment') setSegmentData({ ...segmentData, message: e.target.value });
                  else setSidData({ ...sidData, message: e.target.value });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target URL <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {activeTab === 'segment' ? segmentData.target_url.length : sidData.target_url.length}/255
                </span>
              </div>
              <input
                type="url"
                required
                maxLength={255}
                value={activeTab === 'segment' ? segmentData.target_url : sidData.target_url}
                onChange={(e) => {
                  if (activeTab === 'segment') setSegmentData({ ...segmentData, target_url: e.target.value });
                  else setSidData({ ...sidData, target_url: e.target.value });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Subscriber Icon URL (Optional)
                </label>
                <input
                  type="url"
                  value={activeTab === 'segment' ? segmentData.icon : sidData.icon}
                  onChange={(e) => {
                    if (activeTab === 'segment') setSegmentData({ ...segmentData, icon: e.target.value });
                    else setSidData({ ...sidData, icon: e.target.value });
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">192×192 PNG</span>
              </div>

              {activeTab === 'segment' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Large Banner Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={segmentData.image}
                    onChange={(e) => setSegmentData({ ...segmentData, image: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Supported on Chrome Android & Edge</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Delivery Rules */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">3. Delivery & Expiration</h3>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-4">
                <p className="text-sm font-bold text-slate-900">Expire Push Automatically</p>
                <p className="text-xs text-slate-500 mt-0.5">Notifications will not show after a specified time.</p>
              </div>
              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Enable:</label>
                <select
                  value={activeTab === 'segment' ? (segmentData.expire_push_enabled ? 'true' : 'false') : (sidData.expire_push_enabled ? 'true' : 'false')}
                  onChange={(e) => {
                    const enabled = e.target.value === 'true';
                    if (activeTab === 'segment') {
                      setSegmentData({ ...segmentData, expire_push_enabled: enabled });
                    } else {
                      setSidData({ ...sidData, expire_push_enabled: enabled });
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Length In Time:</label>
                <input
                  type="number"
                  min={1}
                  disabled={activeTab === 'segment' ? !segmentData.expire_push_enabled : !sidData.expire_push_enabled}
                  value={activeTab === 'segment' ? segmentData.expire_push_duration : sidData.expire_push_duration}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                    if (activeTab === 'segment') {
                      setSegmentData({ ...segmentData, expire_push_duration: val });
                    } else {
                      setSidData({ ...sidData, expire_push_duration: val });
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Unit:</label>
                <select
                  disabled={activeTab === 'segment' ? !segmentData.expire_push_enabled : !sidData.expire_push_enabled}
                  value={activeTab === 'segment' ? segmentData.expire_push_unit : sidData.expire_push_unit}
                  onChange={(e) => {
                    const unit = e.target.value;
                    if (activeTab === 'segment') {
                      setSegmentData({ ...segmentData, expire_push_unit: unit });
                    } else {
                      setSidData({ ...sidData, expire_push_unit: unit });
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="d">Days</option>
                  <option value="h">Hours</option>
                  <option value="m">Minutes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Auto Hide
              </label>
              <select
                value={activeTab === 'segment' ? (segmentData.auto_hide ? 'true' : 'false') : (sidData.auto_hide ? 'true' : 'false')}
                onChange={(e) => {
                  const val = e.target.value === 'true';
                  if (activeTab === 'segment') setSegmentData({ ...segmentData, auto_hide: val });
                  else setSidData({ ...sidData, auto_hide: val });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Schedule (Send At - Optional)
              </label>
              <input
                type="datetime-local"
                min={new Date(Date.now() + 6 * 60 * 1000).toISOString().slice(0, 16)}
                value={activeTab === 'segment' ? segmentData.send_at : sidData.send_at}
                onChange={(e) => {
                  if (activeTab === 'segment') setSegmentData({ ...segmentData, send_at: e.target.value });
                  else setSidData({ ...sidData, send_at: e.target.value });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                * Note: Webpushr requires scheduled push to be at least <strong>5 minutes in the future</strong>.
              </p>
              {((activeTab === 'segment' && segmentData.send_at) || (activeTab === 'sid' && sidData.send_at)) && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                  <span>
                    Will be queued on Webpushr for:{' '}
                    <strong>
                      {(() => {
                        const val = activeTab === 'segment' ? segmentData.send_at : sidData.send_at;
                        const d = new Date(val);
                        if (isNaN(d.getTime())) return val;
                        return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                      })()}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Action Buttons */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">4. Action Buttons (Optional)</h3>
            </div>
            {(activeTab === 'segment' ? segmentData.action_buttons.length : sidData.action_buttons.length) < 2 && (
              <button
                type="button"
                onClick={() => handleAddButton(activeTab)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-100/70 px-3 py-1.5 rounded-lg flex items-center transition"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Button
              </button>
            )}
          </div>

          {(activeTab === 'segment' ? segmentData.action_buttons : sidData.action_buttons).length === 0 ? (
            <p className="text-xs text-slate-400 italic">No action buttons configured.</p>
          ) : (
            <div className="space-y-3">
              {(activeTab === 'segment' ? segmentData.action_buttons : sidData.action_buttons).map((btn, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Button #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(activeTab, index)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Button Title (e.g. Check Now)"
                      value={btn.title}
                      onChange={(e) => handleButtonChange(activeTab, index, 'title', e.target.value)}
                      className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                    <input
                      type="url"
                      placeholder="Button URL (https://...)"
                      value={btn.url}
                      onChange={(e) => handleButtonChange(activeTab, index, 'url', e.target.value)}
                      className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center px-8 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 ${
              activeTab === 'segment'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-indigo-500/20 hover:shadow-lg'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20 hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Sending to Webpushr...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {activeTab === 'segment' ? 'Send Segment Notification' : 'Send Test Notification to SID'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* API Response Display */}
      {responseResult && (
        <div className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
          responseResult.success ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {responseResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <h4 className={`text-base font-bold ${responseResult.success ? 'text-emerald-900' : 'text-rose-900'}`}>
              {responseResult.type}: {responseResult.success ? 'Notification Request Accepted by Webpushr' : 'Request Failed'}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-white border border-slate-200">
              HTTP {responseResult.statusCode}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Response Body from Webpushr:</p>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
              {JSON.stringify(responseResult.data, null, 2)}
            </pre>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Payload Sent:</p>
            <pre className="p-4 bg-slate-800 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto">
              {JSON.stringify(responseResult.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* SECTION: Scheduled Pushes & Test Notification History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Test Notifications & Scheduled Queue History
            </h3>
          </div>
          <button
            onClick={fetchLogs}
            disabled={logsLoading}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Notification Title</th>
                <th className="py-3 px-4">Schedule Time (send_at)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logsLoading && testLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-purple-600" />
                    Loading notification logs...
                  </td>
                </tr>
              ) : testLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                    No test notifications dispatched yet. Try sending one above!
                  </td>
                </tr>
              ) : (
                testLogs.map((log) => {
                  const isScheduledWaiting = log.status === 'scheduled_waiting';
                  const isPastScheduled = log.scheduledTime && new Date(log.scheduledTime) < new Date();

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.type === 'segment' 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                            : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}>
                          {log.type === 'segment' ? 'Segment' : 'Subscriber ID'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 max-w-xs truncate" title={log.target}>
                        {log.target}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate" title={log.title}>
                        {log.title}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.send_at ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 flex items-center">
                              <Calendar className="w-3 h-3 mr-1 text-purple-600" />
                              {log.scheduledTime 
                                ? new Date(log.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                : log.send_at
                              }
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{log.send_at}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Immediate</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {log.status === 'failed' ? (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 cursor-help"
                            title={log.responseBody?.description || log.responseBody?.message || 'Request failed'}
                          >
                            Failed ({log.responseStatusCode || 'Err'}: {log.responseBody?.description || 'Error'})
                          </span>
                        ) : log.isScheduled ? (
                          isPastScheduled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Sent (Scheduled)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                              <Clock className="w-3 h-3 mr-1 text-amber-600" /> Waiting to Send
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Sent Now
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

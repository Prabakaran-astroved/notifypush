import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Info,
  Calendar,
  Clock,
  ExternalLink,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExcelFile, createCampaign } from '../api/campaignApi';

export default function CreateCampaign({ onCancel, onCreatedSuccess }) {
  const [step, setStep] = useState(1); // 1: Excel & Name, 2: Notification Config, 3: Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1 states
  const [campaignName, setCampaignName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [parseResults, setParseResults] = useState(null);

  // Step 2 states
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    target_url: '',
    icon: 'https://www.astroved.com/favicon.png',
    expire_push: '1d',
    expire_push_enabled: true,
    expire_push_duration: 1,
    expire_push_unit: 'd', // 'm' | 'h' | 'd'
    auto_hide: true,
    send_at: '',
    action_buttons: []
  });

  // Step 1: File selection & upload parsing
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg('');
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedColumn) {
        formData.append('selectedColumn', selectedColumn);
      }

      const res = await parseExcelFile(formData);
      if (res.data.success) {
        setParseResults(res.data);
        setDetectedColumns(res.data.headers);
        setSelectedColumn(res.data.detectedColumn);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to parse uploaded Excel file');
    } finally {
      setParsing(false);
    }
  };

  const handleColumnChange = async (newCol) => {
    setSelectedColumn(newCol);
    if (!selectedFile) return;

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('selectedColumn', newCol);

      const res = await parseExcelFile(formData);
      if (res.data.success) {
        setParseResults(res.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error re-processing column');
    } finally {
      setParsing(false);
    }
  };

  // Download invalid/duplicates as excel
  const downloadInvalidOrDuplicates = (type) => {
    if (!parseResults) return;
    const items = type === 'invalid' ? parseResults.invalidPreview : parseResults.duplicatePreview;
    if (!items || items.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type.toUpperCase());
    XLSX.writeFile(wb, `${campaignName || 'campaign'}_${type}_records.xlsx`);
  };

  // Step 2 handlers
  const handleAddButton = () => {
    if (notification.action_buttons.length >= 2) return; // Webpushr typically limits action buttons to 2
    setNotification({
      ...notification,
      action_buttons: [...notification.action_buttons, { title: '', url: '' }]
    });
  };

  const handleRemoveButton = (index) => {
    const updated = [...notification.action_buttons];
    updated.splice(index, 1);
    setNotification({ ...notification, action_buttons: updated });
  };

  const handleButtonChange = (index, field, value) => {
    const updated = [...notification.action_buttons];
    updated[index][field] = value;
    setNotification({ ...notification, action_buttons: updated });
  };

  // Navigation validations
  const goToStep2 = () => {
    if (!campaignName.trim()) {
      setErrorMsg('Please enter a Campaign Name');
      return;
    }
    if (!parseResults || parseResults.validCount === 0) {
      setErrorMsg('Please upload an Excel/CSV file with valid numeric Subscriber IDs');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const goToStep3 = () => {
    if (!notification.title.trim()) {
      setErrorMsg('Notification Title is required');
      return;
    }
    if (!notification.message.trim()) {
      setErrorMsg('Notification Message is required');
      return;
    }
    if (!notification.target_url.trim()) {
      setErrorMsg('Target URL is required');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  // Final submit
  const handleFinalSubmit = async (startImmediately = true) => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        campaignName: campaignName.trim(),
        notification: {
          ...notification,
          action_buttons: notification.action_buttons.filter(b => b.title && b.url)
        },
        startImmediately,
        totalImported: parseResults.totalImported,
        validCount: parseResults.validCount,
        invalidCount: parseResults.invalidCount,
        duplicateCount: parseResults.duplicateCount,
        validSubscribersList: parseResults.validSubscribersList
      };

      const res = await createCampaign(payload);
      if (res.data.success) {
        onCreatedSuccess(res.data.campaign);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to submit campaign');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Steps Indicator */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Webpushr Campaign</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload subscriber list, craft your notification, and launch push delivery to Webpushr SIDs.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className={`flex items-center space-x-3 p-3 rounded-xl border ${step === 1 ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${step === 1 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 1</p>
              <p className="text-sm font-bold text-slate-900">Upload & Validate</p>
            </div>
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-xl border ${step === 2 ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${step === 2 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 2</p>
              <p className="text-sm font-bold text-slate-900">Configure Push</p>
            </div>
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-xl border ${step === 3 ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${step === 3 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              3
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 3</p>
              <p className="text-sm font-bold text-slate-900">Confirm & Launch</p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center space-x-3">
          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Excel File Upload & Validation */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Campaign Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Diwali Mega Pooja Offer - High Value SIDs"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
            />
          </div>

          {/* File Upload Box */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Subscriber ID Excel / CSV File <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-orange-500 rounded-2xl p-8 text-center transition bg-slate-50/50">
              <input
                type="file"
                id="excelUpload"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="excelUpload" className="cursor-pointer flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {selectedFile ? selectedFile.name : 'Click to upload Excel or CSV file'}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Supports .xlsx, .xls and .csv (Column: <code className="font-semibold text-slate-700">subscriber_id</code>)
                </span>
              </label>
            </div>
          </div>

          {parsing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center justify-center space-x-2">
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              <span>Parsing and validating subscriber IDs...</span>
            </div>
          )}

          {/* Column selector & Import Statistics */}
          {parseResults && !parsing && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-sm">
                  <span className="text-slate-500">Detected Column: </span>
                  <span className="font-bold text-slate-900">{selectedColumn || 'None'}</span>
                </div>
                {detectedColumns.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-semibold text-slate-600">Select Column:</label>
                    <select
                      value={selectedColumn}
                      onChange={(e) => handleColumnChange(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium"
                    >
                      {detectedColumns.map((col, idx) => (
                        <option key={idx} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Total Imported</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {parseResults.totalImported.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-700 uppercase">Valid SIDs</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {parseResults.validCount.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-amber-700 uppercase">Duplicates</p>
                    {parseResults.duplicateCount > 0 && (
                      <button
                        onClick={() => downloadInvalidOrDuplicates('duplicates')}
                        className="text-[11px] text-amber-700 underline font-semibold flex items-center"
                        title="Download Duplicates"
                      >
                        <Download className="w-3 h-3 mr-0.5" /> CSV
                      </button>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-amber-800 mt-1">
                    {parseResults.duplicateCount.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-rose-700 uppercase">Invalid</p>
                    {parseResults.invalidCount > 0 && (
                      <button
                        onClick={() => downloadInvalidOrDuplicates('invalid')}
                        className="text-[11px] text-rose-700 underline font-semibold flex items-center"
                        title="Download Invalid SIDs"
                      >
                        <Download className="w-3 h-3 mr-0.5" /> CSV
                      </button>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-rose-800 mt-1">
                    {parseResults.invalidCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Preview of first 20 records */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Preview (First 20 Valid Subscriber IDs)
                </p>
                <div className="p-4 bg-slate-900 rounded-xl text-slate-300 font-mono text-xs flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                  {parseResults.preview.map((sid, index) => (
                    <span key={index} className="px-2.5 py-1 bg-slate-800 rounded-lg text-amber-400 border border-slate-700">
                      {sid}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={goToStep2}
              disabled={!parseResults || parseResults.validCount === 0 || !campaignName.trim()}
              className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition"
            >
              Configure Notification
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Notification Configuration Form */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
          {/* Webpushr limitation warning banner */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start space-x-3.5 shadow-sm">
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="leading-relaxed">
              <span className="font-bold text-amber-950">Webpushr API SID Limitation Notice: </span>
              The individual Subscriber ID (SID) API endpoint supports only the <strong>icon</strong> parameter (192×192 PNG).
              The large <code className="px-1 py-0.5 bg-amber-100/60 rounded text-amber-900 font-mono text-[11px]">image</code> parameter is NOT supported by Webpushr's SID endpoint and will be automatically omitted to prevent rejection.
            </div>
          </div>

          {/* Section 1: Push Content Card */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-200/60 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">1. Notification Content</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-medium text-slate-400">{notification.title.length}/100</span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="e.g. AstroVed Daily Horoscope"
                  value={notification.title}
                  onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-medium text-slate-400">{notification.message.length}/255</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={255}
                  placeholder="e.g. Your personalized Vedic astrology prediction is ready! Click to read..."
                  value={notification.message}
                  onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Target URL <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-medium text-slate-400">{notification.target_url.length}/255</span>
                  </div>
                  <input
                    type="url"
                    maxLength={255}
                    placeholder="https://www.astroved.com/horoscope"
                    value={notification.target_url}
                    onChange={(e) => setNotification({ ...notification, target_url: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none transition shadow-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Subscriber Icon URL (Optional)
                    </label>
                    <span className="text-[11px] text-slate-400">192×192 PNG</span>
                  </div>
                  <input
                    type="url"
                    placeholder="https://www.astroved.com/favicon.png"
                    value={notification.icon}
                    onChange={(e) => setNotification({ ...notification, icon: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Delivery & Expiration Settings Card */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-200/60 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">2. Delivery & Display Rules</h3>
            </div>

            {/* Expire Push Automatically Row */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-4">
                  <p className="text-sm font-bold text-slate-900">Expire Push Automatically</p>
                  <p className="text-xs text-slate-500 mt-0.5">Notifications will not show after a specified time.</p>
                </div>
                <div className="lg:col-span-3">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Enable:</label>
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white"
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
                    className="w-full px-3.5 py-2 bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Unit:</label>
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
                    className="w-full px-3.5 py-2 bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  >
                    <option value="d">Days</option>
                    <option value="h">Hours</option>
                    <option value="m">Minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Auto Hide and Scheduling in 2 balanced columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Auto Hide
                </label>
                <p className="text-xs text-slate-400 mb-2">Controls browser notification auto-dismissal</p>
                <select
                  value={notification.auto_hide ? 'true' : 'false'}
                  onChange={(e) => setNotification({ ...notification, auto_hide: e.target.value === 'true' })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white"
                >
                  <option value="false">False</option>
                  <option value="true">True</option>
                </select>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Schedule (Send At - Optional)
                </label>
                <p className="text-xs text-slate-400 mb-2">Leave blank for immediate delivery</p>
                <input
                  type="datetime-local"
                  value={notification.send_at}
                  onChange={(e) => setNotification({ ...notification, send_at: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
                {notification.send_at && (
                  <p className="text-[11px] text-amber-700 font-mono mt-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                    Webpushr UTC offset: {(() => {
                      const d = new Date(notification.send_at);
                      if (isNaN(d.getTime())) return '';
                      const pad = (n) => String(n).padStart(2, '0');
                      const offsetMin = -d.getTimezoneOffset();
                      const sign = offsetMin >= 0 ? '+' : '-';
                      const abs = Math.abs(offsetMin);
                      const off = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
                      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} ${off}`;
                    })()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Action Buttons Card */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">3. Action Buttons (Optional)</h3>
              </div>
              {notification.action_buttons.length < 2 && (
                <button
                  type="button"
                  onClick={handleAddButton}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-100/70 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex items-center transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Button
                </button>
              )}
            </div>

            {notification.action_buttons.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No action buttons added. Click "Add Button" to attach interactive click buttons.</p>
            ) : (
              <div className="space-y-3">
                {notification.action_buttons.map((btn, index) => (
                  <div key={index} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Button #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveButton(index)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Button Title (e.g. View Horoscopes)"
                        value={btn.title}
                        onChange={(e) => handleButtonChange(index, 'title', e.target.value)}
                        className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white"
                      />
                      <input
                        type="url"
                        placeholder="Button URL (https://...)"
                        value={btn.url}
                        onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                        className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <button
              onClick={goToStep3}
              className="inline-flex items-center px-7 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-lg transition-all"
            >
              Review Campaign
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review and Confirm Screen */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Review & Confirm Campaign</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your notification parameters and recipient metrics before initiating Webpushr dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recipient Summary */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campaign & Audience</h4>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Campaign Name:</span>
                  <span className="font-bold text-slate-900">{campaignName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Imported:</span>
                  <span className="font-medium text-slate-900">{parseResults.totalImported.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valid Subscriber IDs:</span>
                  <span className="font-bold text-emerald-600">{parseResults.validCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duplicate IDs (Skipped):</span>
                  <span className="font-medium text-amber-600">{parseResults.duplicateCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invalid IDs (Skipped):</span>
                  <span className="font-medium text-rose-600">{parseResults.invalidCount.toLocaleString()}</span>
                </div>
              </div>

              {/* Notification Push Preview Box */}
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">Browser Push Mockup</h4>
              <div className="p-4 bg-white rounded-xl border-2 border-slate-200 shadow-md max-w-sm">
                <div className="flex items-start space-x-3">
                  <img
                    src={notification.icon || 'https://www.astroved.com/favicon.png'}
                    alt="Push Icon"
                    className="w-10 h-10 rounded-lg object-contain bg-slate-100 flex-shrink-0 border border-slate-200"
                    onError={(e) => { e.target.src = 'https://www.astroved.com/favicon.png'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{notification.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{notification.target_url}</p>
                  </div>
                </div>
                {notification.action_buttons.length > 0 && (
                  <div className="flex space-x-2 mt-3 pt-3 border-t border-slate-100">
                    {notification.action_buttons.map((b, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-[11px] font-semibold text-slate-700 rounded-md">
                        {b.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notification Parameters Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notification Payload Config</h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-sm">
                <div>
                  <span className="text-slate-500 text-xs block">Title</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{notification.title}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Message</span>
                  <p className="font-medium text-slate-800 mt-0.5">{notification.message}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Target URL</span>
                  <p className="font-mono text-xs text-orange-600 break-all mt-0.5">{notification.target_url}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 text-xs block">Expire Push</span>
                    <span className="font-medium text-slate-900 text-xs">{notification.expire_push || 'Default'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Auto Hide</span>
                    <span className="font-medium text-slate-900 text-xs">{notification.auto_hide ? 'True' : 'False'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Send At</span>
                    <span className="font-medium text-slate-900 text-xs">{notification.send_at || 'Immediate'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">API Target</span>
                    <span className="font-medium text-slate-900 text-xs">Webpushr SID Endpoint</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-semibold transition"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleFinalSubmit(true)}
                disabled={submitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Starting Queue...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm & Start Sending
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

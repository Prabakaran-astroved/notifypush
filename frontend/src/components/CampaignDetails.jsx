import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  RefreshCw, 
  Search, 
  ArrowLeft,
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  getCampaignById, 
  getCampaignSubscribers, 
  startCampaign, 
  pauseCampaign, 
  resumeCampaign, 
  retryFailedSubscribers,
  getExportUrl
} from '../api/campaignApi';

export default function CampaignDetails({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subPagination, setSubPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  // Filters & search
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchSid, setSearchSid] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Selected subscribers for batch retry
  const [selectedSids, setSelectedSids] = useState([]);

  // Fetch campaign info
  const fetchCampaignInfo = async () => {
    try {
      const res = await getCampaignById(campaignId);
      if (res.data.success) {
        setCampaign(res.data.campaign);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch subscriber table
  const fetchSubscribers = async (page = 1) => {
    setSubsLoading(true);
    try {
      const params = {
        page,
        limit: subPagination.limit,
        status: statusFilter,
        search: searchSid
      };
      const res = await getCampaignSubscribers(campaignId, params);
      if (res.data.success) {
        setSubscribers(res.data.subscribers);
        setSubPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCampaignInfo(), fetchSubscribers(1)]).finally(() => setLoading(false));
  }, [campaignId]);

  // Polling for live status when campaign is processing
  useEffect(() => {
    if (!campaign || campaign.campaignStatus !== 'processing') return;

    const interval = setInterval(() => {
      fetchCampaignInfo();
      fetchSubscribers(subPagination.page);
    }, 2500); // Poll every 2.5s for real-time progress updates

    return () => clearInterval(interval);
  }, [campaign?.campaignStatus, subPagination.page, statusFilter, searchSid]);

  // Re-fetch subscribers when filter or search changes
  useEffect(() => {
    fetchSubscribers(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubscribers(1);
  };

  // Queue actions
  const handleStart = async () => {
    setActionLoading(true);
    try {
      await startCampaign(campaignId);
      await fetchCampaignInfo();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await pauseCampaign(campaignId);
      await fetchCampaignInfo();
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await resumeCampaign(campaignId);
      await fetchCampaignInfo();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async (specificIds = null) => {
    setActionLoading(true);
    try {
      await retryFailedSubscribers(campaignId, specificIds);
      setSelectedSids([]);
      await Promise.all([fetchCampaignInfo(), fetchSubscribers(1)]);
    } finally {
      setActionLoading(false);
    }
  };

  // Selection toggle
  const toggleSelectSid = (sid) => {
    if (selectedSids.includes(sid)) {
      setSelectedSids(selectedSids.filter(id => id !== sid));
    } else {
      setSelectedSids([...selectedSids, sid]);
    }
  };

  const toggleSelectAllFailed = () => {
    const failedOnPage = subscribers.filter(s => s.status === 'failed').map(s => s.subscriberId);
    const allSelected = failedOnPage.every(id => selectedSids.includes(id));
    if (allSelected) {
      setSelectedSids(selectedSids.filter(id => !failedOnPage.includes(id)));
    } else {
      setSelectedSids([...new Set([...selectedSids, ...failedOnPage])]);
    }
  };

  if (loading && !campaign) {
    return (
      <div className="p-12 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
        <p className="font-semibold">Loading campaign analytics...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-rose-600 font-bold">Campaign not found</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-sm font-semibold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Calculate percentage
  const total = campaign.validSubscribers || 1;
  const processed = (campaign.successCount || 0) + (campaign.failedCount || 0);
  const percentComplete = Math.min(100, Math.round((processed / total) * 100));

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Back to listing"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">{campaign.campaignName}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  campaign.campaignStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                  campaign.campaignStatus === 'processing' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                  campaign.campaignStatus === 'paused' ? 'bg-slate-200 text-slate-700' :
                  campaign.campaignStatus === 'completed_with_errors' ? 'bg-amber-100 text-amber-800' :
                  campaign.campaignStatus === 'draft' ? 'bg-purple-100 text-purple-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {campaign.campaignStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Notification: <span className="font-semibold text-slate-700">{campaign.notification?.title}</span> • Created: {new Date(campaign.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {campaign.campaignStatus === 'draft' && (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center shadow-sm"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" /> Start Sending
              </button>
            )}

            {campaign.campaignStatus === 'processing' && (
              <button
                onClick={handlePause}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center shadow-sm"
              >
                <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
              </button>
            )}

            {campaign.campaignStatus === 'paused' && (
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center shadow-sm"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
              </button>
            )}

            {campaign.failedCount > 0 && campaign.campaignStatus !== 'processing' && (
              <button
                onClick={() => handleRetryFailed(selectedSids.length > 0 ? selectedSids : null)}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                {selectedSids.length > 0 ? `Retry Selected (${selectedSids.length})` : `Retry All Failed (${campaign.failedCount})`}
              </button>
            )}

            {/* Export Dropdown / Button */}
            <a
              href={getExportUrl(campaign._id, statusFilter)}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center border border-slate-200 transition"
              title="Download Campaign Excel Report"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Export Excel
            </a>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs font-semibold mb-2">
            <span className="text-slate-600">
              Delivery Progress: <strong className="text-slate-900">{percentComplete}%</strong> ({processed.toLocaleString()} of {total.toLocaleString()} processed)
            </span>
            <span className="text-slate-400">
              Target SID Concurrency: 5 workers
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${Math.round(((campaign.successCount || 0) / total) * 100)}%` }} 
              className="bg-emerald-500 transition-all duration-500" 
              title={`Success: ${campaign.successCount || 0}`}
            />
            <div 
              style={{ width: `${Math.round(((campaign.failedCount || 0) / total) * 100)}%` }} 
              className="bg-rose-500 transition-all duration-500" 
              title={`Failed: ${campaign.failedCount || 0}`}
            />
            <div 
              style={{ width: `${Math.round(((campaign.processingCount || 0) / total) * 100)}%` }} 
              className="bg-blue-500 animate-pulse transition-all duration-500" 
              title={`Processing: ${campaign.processingCount || 0}`}
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total SIDs</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{(campaign.validSubscribers || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Pending</span>
          <p className="text-2xl font-bold text-slate-600 mt-1">{(campaign.pendingCount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="text-xs font-semibold text-blue-600 uppercase">Processing</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{(campaign.processingCount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200 bg-emerald-50/20">
          <span className="text-xs font-semibold text-emerald-700 uppercase">Sent Successfully</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{(campaign.successCount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-200 bg-rose-50/20">
          <span className="text-xs font-semibold text-rose-700 uppercase">Failed</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{(campaign.failedCount || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Subscriber Tracking Table & Server-side Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table header with filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filter:
            </span>
            <div className="flex space-x-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
              {['all', 'pending', 'processing', 'success', 'failed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg capitalize transition ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Subscriber ID..."
              value={searchSid}
              onChange={(e) => setSearchSid(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </form>
        </div>

        {/* Table view */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAllFailed}
                    title="Select all failed on this page"
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="py-3 px-4">Subscriber ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-3 text-center">HTTP Code</th>
                <th className="py-3 px-4">Response / Error</th>
                <th className="py-3 px-3 text-center">Retries</th>
                <th className="py-3 px-4">Last Attempt</th>
                <th className="py-3 px-4">Sent Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {subsLoading ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                    Fetching subscriber records...
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400 font-medium">
                    No subscriber records found for the selected filter.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => {
                  const isFailed = sub.status === 'failed';
                  const isChecked = selectedSids.includes(sub.subscriberId);

                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center">
                        {isFailed ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSid(sub.subscriberId)}
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sub.subscriberId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {sub.status === 'success' && (
                          <span className="inline-flex items-center text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                          </span>
                        )}
                        {sub.status === 'failed' && (
                          <span className="inline-flex items-center text-rose-700 font-bold">
                            <XCircle className="w-3 h-3 mr-1" /> Failed
                          </span>
                        )}
                        {sub.status === 'processing' && (
                          <span className="inline-flex items-center text-blue-700 font-semibold animate-pulse">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Processing
                          </span>
                        )}
                        {sub.status === 'pending' && (
                          <span className="inline-flex items-center text-slate-500 font-medium">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {sub.responseStatusCode ? (
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            sub.responseStatusCode >= 200 && sub.responseStatusCode < 300 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {sub.responseStatusCode}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate" title={sub.errorMessage || JSON.stringify(sub.responseBody)}>
                        {sub.errorMessage ? (
                          <span className="text-rose-600 font-medium">{sub.errorMessage}</span>
                        ) : sub.responseBody ? (
                          <span className="text-slate-500 font-mono text-[11px] truncate">
                            {JSON.stringify(sub.responseBody)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-800">
                        {sub.retryCount || 0}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {sub.lastAttemptAt ? new Date(sub.lastAttemptAt).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {sub.sentAt ? new Date(sub.sentAt).toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Subscriber Pagination */}
        {subPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Showing page {subPagination.page} of {subPagination.totalPages} ({subPagination.total} subscribers)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={subPagination.page <= 1}
                onClick={() => fetchSubscribers(subPagination.page - 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={subPagination.page >= subPagination.totalPages}
                onClick={() => fetchSubscribers(subPagination.page + 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

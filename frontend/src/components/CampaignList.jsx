import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Edit3, 
  Plus, 
  Search, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function CampaignList({ 
  campaigns, 
  loading, 
  pagination, 
  fetchCampaigns, 
  onViewCampaign, 
  onEditCampaign, 
  onCreateCampaign,
  onStartCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onRetryFailed,
  onDeleteCampaign,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter
}) {

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Completed
          </span>
        );
      case 'completed_with_errors':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> With Errors
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 text-blue-600 animate-spin" /> Processing
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <Pause className="w-3 h-3 mr-1 text-slate-600" /> Paused
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Clock className="w-3 h-3 mr-1 text-purple-600" /> Draft
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Subscriber ID Campaigns</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage, dispatch and live-track Webpushr push notifications to targeted Subscriber IDs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchCampaigns()}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition font-medium text-sm flex items-center space-x-1"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateCampaign}
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="processing">Processing</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="completed_with_errors">Completed With Errors</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Campaign Listing Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Campaign Name</th>
                <th className="py-3.5 px-4">Notification Title</th>
                <th className="py-3.5 px-3 text-center">Total</th>
                <th className="py-3.5 px-3 text-center">Pending</th>
                <th className="py-3.5 px-3 text-center">Processing</th>
                <th className="py-3.5 px-3 text-center">Success</th>
                <th className="py-3.5 px-3 text-center">Failed</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4">Sending Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    No campaigns found. Click "Create Campaign" to launch your first Webpushr campaign!
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp._id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span 
                          onClick={() => onViewCampaign(camp._id)}
                          className="hover:text-orange-600 cursor-pointer hover:underline"
                        >
                          {camp.campaignName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 max-w-xs truncate" title={camp.notification?.title}>
                      {camp.notification?.title || '-'}
                    </td>
                    <td className="py-4 px-3 text-center font-medium text-slate-900">
                      {(camp.validSubscribers || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-center text-slate-500">
                      {(camp.pendingCount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-center text-blue-600 font-medium">
                      {(camp.processingCount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-center text-emerald-600 font-bold">
                      {(camp.successCount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-center text-rose-600 font-bold">
                      {(camp.failedCount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(camp.createdAt).toLocaleDateString()} {new Date(camp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(camp.campaignStatus)}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => onViewCampaign(camp._id)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="View Campaign & Live Tracking"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {camp.campaignStatus === 'draft' && (
                          <>
                            <button
                              onClick={() => onEditCampaign(camp)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Draft"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onStartCampaign(camp._id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                              title="Start Sending"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteCampaign(camp._id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {camp.campaignStatus === 'processing' && (
                          <button
                            onClick={() => onPauseCampaign(camp._id)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                            title="Pause Sending"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        {camp.campaignStatus === 'paused' && (
                          <button
                            onClick={() => onResumeCampaign(camp._id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                            title="Resume Sending"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {camp.failedCount > 0 && camp.campaignStatus !== 'processing' && (
                          <button
                            onClick={() => onRetryFailed(camp._id)}
                            className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition"
                            title="Retry Failed Subscribers"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total campaigns)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchCampaigns(pagination.page - 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCampaigns(pagination.page + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
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

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CampaignList from './components/CampaignList';
import CreateCampaign from './components/CreateCampaign';
import CampaignDetails from './components/CampaignDetails';
import EditDraftCampaign from './components/EditDraftCampaign';
import { 
  getCampaigns, 
  startCampaign, 
  pauseCampaign, 
  resumeCampaign, 
  retryFailedSubscribers, 
  deleteCampaign 
} from './api/campaignApi';

export default function App() {
  const [currentView, setCurrentView] = useState('campaigns'); // 'campaigns' | 'create' | 'details' | 'edit'
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Active campaign in view or edit
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);

  // Fetch campaigns
  const fetchCampaigns = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: searchQuery,
        status: statusFilter
      };
      const res = await getCampaigns(params);
      if (res.data.success) {
        setCampaigns(res.data.campaigns);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(1);
  }, [searchQuery, statusFilter]);

  // Actions
  const handleViewCampaign = (id) => {
    setActiveCampaignId(id);
    setCurrentView('details');
  };

  const handleEditCampaign = (camp) => {
    setEditingCampaign(camp);
    setCurrentView('edit');
  };

  const handleStart = async (id) => {
    try {
      await startCampaign(id);
      fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start campaign');
    }
  };

  const handlePause = async (id) => {
    try {
      await pauseCampaign(id);
      fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to pause campaign');
    }
  };

  const handleResume = async (id) => {
    try {
      await resumeCampaign(id);
      fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resume campaign');
    }
  };

  const handleRetryFailed = async (id) => {
    try {
      await retryFailedSubscribers(id);
      fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to retry subscribers');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft campaign?')) return;
    try {
      await deleteCampaign(id);
      fetchCampaigns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete draft campaign');
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={(view) => {
          setCurrentView(view);
          if (view === 'campaigns') {
            fetchCampaigns(1);
          }
        }} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">Webpushr</span>
            <span>/</span>
            <span className="text-orange-600 font-bold">Subscriber ID Campaigns</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Webpushr SID Gateway Ready</span>
            </div>
          </div>
        </header>

        {/* View Routing */}
        <main className="flex-1 p-8">
          {currentView === 'campaigns' && (
            <CampaignList
              campaigns={campaigns}
              loading={loading}
              pagination={pagination}
              fetchCampaigns={fetchCampaigns}
              onViewCampaign={handleViewCampaign}
              onEditCampaign={handleEditCampaign}
              onCreateCampaign={() => setCurrentView('create')}
              onStartCampaign={handleStart}
              onPauseCampaign={handlePause}
              onResumeCampaign={handleResume}
              onRetryFailed={handleRetryFailed}
              onDeleteCampaign={handleDelete}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          )}

          {currentView === 'create' && (
            <CreateCampaign
              onCancel={() => setCurrentView('campaigns')}
              onCreatedSuccess={(newCampaign) => {
                fetchCampaigns(1);
                setActiveCampaignId(newCampaign._id);
                setCurrentView('details');
              }}
            />
          )}

          {currentView === 'details' && activeCampaignId && (
            <CampaignDetails
              campaignId={activeCampaignId}
              onBack={() => {
                setCurrentView('campaigns');
                fetchCampaigns(pagination.page);
              }}
            />
          )}

          {currentView === 'edit' && editingCampaign && (
            <EditDraftCampaign
              campaign={editingCampaign}
              onCancel={() => setCurrentView('campaigns')}
              onSavedSuccess={() => {
                fetchCampaigns(pagination.page);
                setCurrentView('campaigns');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

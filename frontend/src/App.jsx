import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import CampaignList from './components/CampaignList';
import CreateCampaign from './components/CreateCampaign';
import CampaignDetails from './components/CampaignDetails';
import EditDraftCampaign from './components/EditDraftCampaign';
import SegmentTest from './components/SegmentTest';
import SettingsPage from './components/SettingsPage';
import { RefreshCw } from 'lucide-react';
import { 
  getCampaigns, 
  startCampaign, 
  pauseCampaign, 
  resumeCampaign, 
  retryFailedSubscribers, 
  deleteCampaign 
} from './api/campaignApi';

function MainApp() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState('campaigns'); // 'campaigns' | 'create' | 'details' | 'edit' | 'segment' | 'settings'
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
    if (!isAuthenticated) return;
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
    if (isAuthenticated) {
      fetchCampaigns(1);
    }
  }, [searchQuery, statusFilter, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

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
      alert(err.response?.data?.error || 'Failed to delete campaign');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
      {/* Sidebar */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={(view) => {
          setCurrentView(view);
          if (view === 'campaigns') fetchCampaigns(pagination.page);
        }} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
            <span>Webpushr</span>
            <span>/</span>
            <span className="text-orange-600 font-semibold capitalize">
              {currentView === 'campaigns' && 'Subscriber ID Campaigns'}
              {currentView === 'create' && 'Create Campaign'}
              {currentView === 'details' && 'Campaign Details & Live Tracking'}
              {currentView === 'edit' && 'Edit Draft Campaign'}
              {currentView === 'segment' && 'Notification Test Studio'}
              {currentView === 'settings' && 'System & Account Settings'}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Webpushr SID Gateway Ready
            </span>
          </div>
        </header>

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

          {currentView === 'segment' && (
            <SegmentTest />
          )}

          {currentView === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

import axios from 'axios';

const api = axios.create({
  baseURL: '/api/webpushr/campaigns',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pushhub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const parseExcelFile = (formData) => {
  const token = localStorage.getItem('pushhub_token');
  const headers = { 'Content-Type': 'multipart/form-data' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return axios.post('/api/webpushr/campaigns/parse-excel', formData, { headers });
};

export const createCampaign = (campaignData) => {
  return api.post('/', campaignData);
};

export const getCampaigns = (params) => {
  return api.get('/', { params });
};

export const getCampaignById = (campaignId) => {
  return api.get(`/${campaignId}`);
};

export const updateDraftCampaign = (campaignId, data) => {
  return api.put(`/${campaignId}`, data);
};

export const getCampaignSubscribers = (campaignId, params) => {
  return api.get(`/${campaignId}/subscribers`, { params });
};

export const startCampaign = (campaignId) => {
  return api.post(`/${campaignId}/start`);
};

export const pauseCampaign = (campaignId) => {
  return api.post(`/${campaignId}/pause`);
};

export const resumeCampaign = (campaignId) => {
  return api.post(`/${campaignId}/resume`);
};

export const retryFailedSubscribers = (campaignId, selectedSubscriberIds) => {
  return api.post(`/${campaignId}/retry-failed`, { selectedSubscriberIds });
};

export const deleteCampaign = (campaignId) => {
  return api.delete(`/${campaignId}`);
};

export const sendSegmentNotification = (data) => {
  return api.post('/send-segment', data);
};

export const sendSidTestNotification = (data) => {
  return api.post('/send-sid-test', data);
};

export const getTestLogs = () => {
  return api.get('/test-logs');
};

export const deleteTestLogs = (ids) => {
  return api.delete('/test-logs', { data: { ids } });
};

export const deleteTestLog = (id) => {
  return api.delete(`/test-logs/${id}`);
};

export const getExportUrl = (campaignId, status = 'all') => {
  return `/api/webpushr/campaigns/${campaignId}/export?status=${status}`;
};

export const getCampaignsSummaryExportUrl = (search = '', status = '') => {
  return `/api/webpushr/campaigns/export-summary?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`;
};

export const exportSelectedSubscribers = (campaignId, selectedSids) => {
  return api.post(`/${campaignId}/export`, { selectedSids }, { responseType: 'blob' });
};

export default api;

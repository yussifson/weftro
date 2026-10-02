
import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { isAdmin, isSuperAdmin } from '@/lib/constants';
import { ImpersonationProvider } from '@/lib/ImpersonationContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { VideoProvider } from '@/lib/VideoContext';
import { HelmetProvider } from 'react-helmet-async';
import { PowerSyncContext } from '@powersync/react';
import { powerSync } from './api/PowerSyncConnector';

import ClipadLayout from '@/components/layout/ClipadLayout';
import ClipadAdminLayout from '@/components/layout/ClipadAdminLayout';

const SpaceDashboard = React.lazy(() => import('@/pages/clipad/SpaceDashboard'));
const RecordVideo = React.lazy(() => import('@/pages/clipad/RecordVideo'));
const WatchVideo = React.lazy(() => import('@/pages/clipad/WatchVideo'));
const CliPadSettings = React.lazy(() => import('@/pages/clipad/CliPadSettings'));
const VideoAnalytics = React.lazy(() => import('@/pages/clipad/VideoAnalytics'));
const CliPadEnterpriseDashboard = React.lazy(() => import('@/pages/clipad/admin/EnterpriseDashboard'));
const KnowledgeHealth = React.lazy(() => import('@/pages/clipad/KnowledgeHealth'));
const KnowledgeTimeline = React.lazy(() => import('@/pages/clipad/KnowledgeTimeline'));
const DecisionLedger = React.lazy(() => import('@/pages/clipad/DecisionLedger'));
const KnowledgeGraph = React.lazy(() => import('@/pages/clipad/KnowledgeGraph'));
const ActionItems = React.lazy(() => import('@/pages/clipad/ActionItems'));
const KnowledgeJourney = React.lazy(() => import('@/pages/clipad/KnowledgeJourney'));
const IntegrationAnalytics = React.lazy(() => import('@/pages/clipad/IntegrationAnalytics'));
const CliPadDashboard = React.lazy(() => import('@/pages/clipad/CliPadDashboard'));
const CliPadLogin = React.lazy(() => import('@/pages/clipad/CliPadLogin'));
const CliPadSignUp = React.lazy(() => import('@/pages/clipad/CliPadSignUp'));
const SpacesList = React.lazy(() => import('@/pages/clipad/SpacesList'));
const MeetingRecord = React.lazy(() => import('@/pages/clipad/MeetingRecord'));
const SaveMeetingPage = React.lazy(() => import('@/pages/clipad/SaveMeetingPage'));
const MeetingsList = React.lazy(() => import('@/pages/clipad/MeetingsList'));
const VideosList = React.lazy(() => import('@/pages/clipad/VideosList'));
const CliPadSupport = React.lazy(() => import('@/pages/clipad/CliPadSupport'));
const ClipadChat = React.lazy(() => import('@/pages/clipad/ClipadChat'));
const ClipadAdminOverview = React.lazy(() => import('@/pages/clipad/admin/Overview'));
const CompanyManagement = React.lazy(() => import('@/pages/clipad/admin/CompanyManagement'));
const PricingTags = React.lazy(() => import('@/pages/clipad/admin/PricingTags'));
const AuditMonitor = React.lazy(() => import('@/pages/clipad/admin/AuditMonitor'));
const ClipadLiveSupport = React.lazy(() => import('@/pages/clipad/admin/LiveSupport'));
const AdminAI = React.lazy(() => import('@/pages/clipad/admin/AdminAI'));
const CliPadCustomPricing = React.lazy(() => import('@/pages/clipad/CliPadCustomPricing'));
const CustomRequests = React.lazy(() => import('@/pages/clipad/admin/CustomRequests'));

const IntegrationsHub = React.lazy(() => import('@/pages/clipad/IntegrationsHub'));
const SearchHub = React.lazy(() => import('@/pages/clipad/SearchHub'));
const DecisionReplay = React.lazy(() => import('@/pages/clipad/DecisionReplay'));
const CommitmentIntelligence = React.lazy(() => import('@/pages/clipad/CommitmentIntelligence'));
const PredictiveRisk = React.lazy(() => import('@/pages/clipad/PredictiveRisk'));
const OrgHealthPulse = React.lazy(() => import('@/pages/clipad/OrgHealthPulse'));
const CrossSpaceIntelligence = React.lazy(() => import('@/pages/clipad/CrossSpaceIntelligence'));

const AnalyticsPageRouter = () => {
  const { user } = useAuth();
  const plan = user?.clipad_plan || user?.user_metadata?.clipad_plan || 'free';
  if (isAdmin(user)) {
    return <CliPadEnterpriseDashboard />;
  }
  return <VideoAnalytics />;
};


const SuperAdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || !isSuperAdmin(user)) return <Navigate to='/dashboard' replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || !isAdmin(user)) return <Navigate to='/dashboard' replace />;
  return children;
};

function App() {
  return (
    <React.StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClientInstance}>
          <PowerSyncContext.Provider value={powerSync}>
            
              <ImpersonationProvider>
              <AuthProvider>
                <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                  <VideoProvider>
                  <BrowserRouter>
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <Routes>
                        <Route path="/login" element={<CliPadLogin />} />
                        <Route path="/signup" element={<CliPadSignUp />} />
                        <Route path="/custom-pricing" element={<CliPadCustomPricing />} />
                        
                        <Route element={<ClipadLayout />}>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<CliPadDashboard />} />
                          <Route path="/analytics" element={<AnalyticsPageRouter />} />
                          <Route path="/enterprise" element={<CliPadEnterpriseDashboard />} />
                          <Route path="/spaces" element={<SpacesList />} />
                          <Route path="/spaces/:spaceId" element={<SpaceDashboard />} />
                          <Route path="/health" element={<KnowledgeHealth />} />
                          <Route path="/timeline" element={<KnowledgeTimeline />} />
                          <Route path="/decisions" element={<DecisionLedger />} />
                          <Route path="/graph" element={<KnowledgeGraph />} />
                          <Route path="/action-items" element={<ActionItems />} />
                          <Route path="/knowledge" element={<KnowledgeJourney />} />
                          <Route path="/integration-analytics" element={<IntegrationAnalytics />} />
                          <Route path="/record-meeting" element={<MeetingRecord />} />
                          <Route path="/save-meeting" element={<SaveMeetingPage />} />
                          <Route path="/meetings" element={<MeetingsList />} />
                          <Route path="/videos" element={<VideosList />} />
                          <Route path="/support" element={<CliPadSupport />} />
                          <Route path="/chat" element={<ClipadChat />} />
                          <Route path="/capture" element={<IntegrationsHub />} />
                          <Route path="/search" element={<SearchHub />} />
                          <Route path="/settings" element={<CliPadSettings />} />
                          
                          <Route path="/decision-replay" element={<SuperAdminRoute><DecisionReplay /></SuperAdminRoute>} />
                          <Route path="/commitment-intelligence" element={<SuperAdminRoute><CommitmentIntelligence /></SuperAdminRoute>} />
                          <Route path="/predictive-risk" element={<SuperAdminRoute><PredictiveRisk /></SuperAdminRoute>} />
                          <Route path="/org-health-pulse" element={<SuperAdminRoute><OrgHealthPulse /></SuperAdminRoute>} />
                          <Route path="/cross-space-intelligence" element={<SuperAdminRoute><CrossSpaceIntelligence /></SuperAdminRoute>} />
                        </Route>

                        <Route path="/admin" element={<ClipadAdminLayout />}>
                          <Route index element={<SuperAdminRoute><ClipadAdminOverview /></SuperAdminRoute>} />
                          <Route path="companies" element={<SuperAdminRoute><CompanyManagement /></SuperAdminRoute>} />
                          <Route path="pricing" element={<SuperAdminRoute><PricingTags /></SuperAdminRoute>} />
                          <Route path="audit" element={<SuperAdminRoute><AuditMonitor /></SuperAdminRoute>} />
                          <Route path="support" element={<SuperAdminRoute><ClipadLiveSupport /></SuperAdminRoute>} />
                          <Route path="ai" element={<SuperAdminRoute><AdminAI /></SuperAdminRoute>} />
                          <Route path="custom-requests" element={<AdminRoute><CustomRequests /></AdminRoute>} />
                        </Route>

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </React.Suspense>
                  </BrowserRouter>
              
                </VideoProvider>
                </ThemeProvider>
              </AuthProvider>
              </ImpersonationProvider>
            <Toaster />
            <SonnerToaster />
            <HotToaster position="top-right" />
          </PowerSyncContext.Provider>
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
}

export default App;






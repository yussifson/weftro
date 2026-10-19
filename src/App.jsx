
import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
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
import ClipadLoader from '@/components/ui/ClipadLoader';
import { safeLazy } from '@/lib/safeLazy';

const SpaceDashboard = safeLazy(() => import('@/pages/clipad/SpaceDashboard'));
const RecordVideo = safeLazy(() => import('@/pages/clipad/RecordVideo'));
const WatchVideo = safeLazy(() => import('@/pages/clipad/WatchVideo'));
const VideoRoom = safeLazy(() => import('@/components/video/VideoRoom'));
const CliPadSettings = safeLazy(() => import('@/pages/clipad/CliPadSettings'));
const VideoAnalytics = safeLazy(() => import('@/pages/clipad/VideoAnalytics'));
const CliPadEnterpriseDashboard = safeLazy(() => import('@/pages/clipad/admin/EnterpriseDashboard'));
const KnowledgeHealth = safeLazy(() => import('@/pages/clipad/KnowledgeHealth'));
const KnowledgeTimeline = safeLazy(() => import('@/pages/clipad/KnowledgeTimeline'));
const DecisionLedger = safeLazy(() => import('@/pages/clipad/DecisionLedger'));
const KnowledgeGraph = safeLazy(() => import('@/pages/clipad/KnowledgeGraph'));
const ActionItems = safeLazy(() => import('@/pages/clipad/ActionItems'));
const KnowledgeJourney = safeLazy(() => import('@/pages/clipad/KnowledgeJourney'));
const IntegrationAnalytics = safeLazy(() => import('@/pages/clipad/IntegrationAnalytics'));
const MeetLandingPage = safeLazy(() => import('@/pages/MeetLandingPage'));
const PricingPage = safeLazy(() => import('@/pages/PricingPage'));
const SecurityPage = safeLazy(() => import('@/pages/SecurityPage'));
const CliPadDashboard = safeLazy(() => import('@/pages/clipad/CliPadDashboard'));
const CliPadLogin = safeLazy(() => import('@/pages/clipad/CliPadLogin'));
const CliPadSignUp = safeLazy(() => import('@/pages/clipad/CliPadSignUp'));
const SpacesList = safeLazy(() => import('@/pages/clipad/SpacesList'));
const MeetingRecord = safeLazy(() => import('@/pages/clipad/MeetingRecord'));
const SaveMeetingPage = safeLazy(() => import('@/pages/clipad/SaveMeetingPage'));
const MeetingsList = safeLazy(() => import('@/pages/clipad/MeetingsList'));
const VideosList = safeLazy(() => import('@/pages/clipad/VideosList'));
const CliPadSupport = safeLazy(() => import('@/pages/clipad/CliPadSupport'));
const ClipadChat = safeLazy(() => import('@/pages/clipad/ClipadChat'));
const ClipadAdminOverview = safeLazy(() => import('@/pages/clipad/admin/Overview'));
const CompanyManagement = safeLazy(() => import('@/pages/clipad/admin/CompanyManagement'));
const PricingTags = safeLazy(() => import('@/pages/clipad/admin/PricingTags'));
const AuditMonitor = safeLazy(() => import('@/pages/clipad/admin/AuditMonitor'));
const ClipadLiveSupport = safeLazy(() => import('@/pages/clipad/admin/LiveSupport'));
const AdminAI = safeLazy(() => import('@/pages/clipad/admin/AdminAI'));
const CliPadCustomPricing = safeLazy(() => import('@/pages/clipad/CliPadCustomPricing'));
const CustomRequests = safeLazy(() => import('@/pages/clipad/admin/CustomRequests'));

const IntegrationsHub = safeLazy(() => import('@/pages/clipad/IntegrationsHub'));
const DeveloperPlatform = safeLazy(() => import('@/pages/clipad/DeveloperPlatform'));
const CapturePage = safeLazy(() => import('@/pages/clipad/CapturePage'));
const SearchHub = safeLazy(() => import('@/pages/clipad/SearchHub'));
const DecisionReplay = safeLazy(() => import('@/pages/clipad/DecisionReplay'));
const CommitmentIntelligence = safeLazy(() => import('@/pages/clipad/CommitmentIntelligence'));
const PredictiveRisk = safeLazy(() => import('@/pages/clipad/PredictiveRisk'));
const OrgHealthPulse = safeLazy(() => import('@/pages/clipad/OrgHealthPulse'));
const CrossSpaceIntelligence = safeLazy(() => import('@/pages/clipad/CrossSpaceIntelligence'));

const AnalyticsPageRouter = () => {
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

// Redirect / and unknown routes: logged-in → dashboard, guest → login
const RootRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
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
                    <AnalyticsTracker />
                    <React.Suspense fallback={<ClipadLoader fullScreen={true} text="" />}>
                      <Routes>
                        <Route path="/login" element={<CliPadLogin />} />
                        <Route path="/signup" element={<CliPadSignUp />} />
                        <Route path="/custom-pricing" element={<CliPadCustomPricing />} />
                        <Route path="/" element={<MeetLandingPage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/security" element={<SecurityPage />} />
                        <Route path="/home" element={<MeetLandingPage />} />
                        <Route path="/marketing" element={<MeetLandingPage />} />
                        <Route path="/about" element={<MeetLandingPage />} />
                        <Route path="/meet" element={<MeetLandingPage />} />

                        <Route element={<ClipadLayout />}>
                          <Route path="/dashboard" element={<CliPadDashboard />} />
                          <Route path="/analytics" element={<AdminRoute><AnalyticsPageRouter /></AdminRoute>} />
                          <Route path="/enterprise" element={<CliPadEnterpriseDashboard />} />
                          <Route path="/spaces" element={<SpacesList />} />
                          <Route path="/spaces/:spaceId" element={<SpaceDashboard />} />
                          <Route path="/health" element={<KnowledgeHealth />} />
                          <Route path="/timeline" element={<KnowledgeTimeline />} />
                          <Route path="/decisions" element={<DecisionLedger />} />
                          <Route path="/graph" element={<KnowledgeGraph />} />
                          <Route path="/action-items" element={<ActionItems />} />
                          <Route path="/knowledge" element={<KnowledgeJourney />} />
                          <Route path="/integration-analytics" element={<AdminRoute><IntegrationAnalytics /></AdminRoute>} />
                          <Route path="/record-meeting" element={<MeetingRecord />} />

                          <Route path="/record" element={<RecordVideo />} />
                          <Route path="/record/:id" element={<RecordVideo />} />
                          <Route path="/watch/:id" element={<WatchVideo />} />
                          <Route path="/meetings/:id" element={<MeetingRecord />} />
                          <Route path="/join/:id" element={<VideoRoom />} />
                          <Route path="/save-meeting" element={<SaveMeetingPage />} />
                          <Route path="/save-meeting/:id" element={<SaveMeetingPage />} />
                          <Route path="/meetings" element={<MeetingsList />} />
                          <Route path="/videos" element={<VideosList />} />
                          <Route path="/support" element={<CliPadSupport />} />
                          <Route path="/chat" element={<ClipadChat />} />
                          <Route path="/capture" element={<CapturePage />} />
                          <Route path="/integrations" element={<IntegrationsHub />} />
                          <Route path="/developers" element={<DeveloperPlatform />} />
                          <Route path="/developers/*" element={<DeveloperPlatform />} />
                          <Route path="/search" element={<SearchHub />} />
                          <Route path="/settings" element={<CliPadSettings />} />
                          
                          <Route path="/decision-replay" element={<SuperAdminRoute><DecisionReplay /></SuperAdminRoute>} />
                          <Route path="/commitment-intelligence" element={<SuperAdminRoute><CommitmentIntelligence /></SuperAdminRoute>} />
                          <Route path="/predictive-risk" element={<SuperAdminRoute><PredictiveRisk /></SuperAdminRoute>} />
                          <Route path="/org-health-pulse" element={<SuperAdminRoute><OrgHealthPulse /></SuperAdminRoute>} />
                          <Route path="/cross-space-intelligence" element={<SuperAdminRoute><CrossSpaceIntelligence /></SuperAdminRoute>} />
                        </Route>

                        <Route path="/admin" element={<SuperAdminRoute><ClipadAdminLayout /></SuperAdminRoute>}>
                          <Route index element={<SuperAdminRoute><ClipadAdminOverview /></SuperAdminRoute>} />
                          <Route path="companies" element={<SuperAdminRoute><CompanyManagement /></SuperAdminRoute>} />
                          <Route path="pricing" element={<SuperAdminRoute><PricingTags /></SuperAdminRoute>} />
                          <Route path="audit" element={<SuperAdminRoute><AuditMonitor /></SuperAdminRoute>} />
                          <Route path="support" element={<SuperAdminRoute><ClipadLiveSupport /></SuperAdminRoute>} />
                          <Route path="ai" element={<SuperAdminRoute><AdminAI /></SuperAdminRoute>} />
                          <Route path="custom-requests" element={<SuperAdminRoute><CustomRequests /></SuperAdminRoute>} />
                        </Route>

                        <Route path="*" element={<RootRedirect />} />
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











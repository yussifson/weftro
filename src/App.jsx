import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { Toaster as HotToaster } from "react-hot-toast"
import { useToast } from "@/components/ui/use-toast"
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter, HashRouter, Route, Routes, Outlet, Navigate, useLocation } from 'react-router-dom';
import { isDesktopApp } from '@/lib/domainUtils';
const Router = isDesktopApp() ? HashRouter : BrowserRouter;
import PageNotFound from './lib/PageNotFound';
const JoinMeeting = React.lazy(() => import('@/pages/JoinMeeting'));
const StandaloneMeeting = React.lazy(() => import('@/pages/StandaloneMeeting'));
const MeetLandingPage = React.lazy(() => import('@/pages/MeetLandingPage'));
// CliPad Imports
import ClipadLayout from '@/components/layout/ClipadLayout';
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
const ClipadAdminLayout = React.lazy(() => import('@/components/layout/ClipadAdminLayout'));
const ClipadAdminOverview = React.lazy(() => import('@/pages/clipad/admin/Overview'));
const CompanyManagement = React.lazy(() => import('@/pages/clipad/admin/CompanyManagement'));
const PricingTags = React.lazy(() => import('@/pages/clipad/admin/PricingTags'));
const AuditMonitor = React.lazy(() => import('@/pages/clipad/admin/AuditMonitor'));
const ClipadLiveSupport = React.lazy(() => import('@/pages/clipad/admin/LiveSupport'));
const AdminAI = React.lazy(() => import('@/pages/clipad/admin/AdminAI'));
const CliPadCustomPricing = React.lazy(() => import('@/pages/clipad/CliPadCustomPricing'));
const CustomRequests = React.lazy(() => import('@/pages/clipad/admin/CustomRequests'));
const AnalyticsPageRouter = () => {
  const { user } = useAuth();
  const plan = user?.clipad_plan || user?.user_metadata?.clipad_plan || 'free';
  if (plan === 'enterprise' || user?.role === 'super_admin' || user?.role === 'admin') {
    return <CliPadEnterpriseDashboard />;
  }
  return <VideoAnalytics />;
};

const IntegrationsHub = React.lazy(() => import('@/pages/clipad/IntegrationsHub'));
const SearchHub = React.lazy(() => import('@/pages/clipad/SearchHub'));
// CliPad 3.0 Intelligence Pages
const DecisionReplay = React.lazy(() => import('@/pages/clipad/DecisionReplay'));
const CommitmentIntelligence = React.lazy(() => import('@/pages/clipad/CommitmentIntelligence'));
const PredictiveRisk = React.lazy(() => import('@/pages/clipad/PredictiveRisk'));
const OrgHealthPulse = React.lazy(() => import('@/pages/clipad/OrgHealthPulse'));
const CrossSpaceIntelligence = React.lazy(() => import('@/pages/clipad/CrossSpaceIntelligence'));

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ImpersonationProvider } from '@/lib/ImpersonationContext';
import { VideoProvider } from '@/lib/VideoContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
const EnterpriseDashboard = React.lazy(() => import('./pages/EnterpriseDashboard'));
import Intelligence from '@/pages/Intelligence';
// React imported at the top
import { PowerSyncContext } from '@powersync/react';
import { HelmetProvider } from 'react-helmet-async';
import { powerSync, initPowerSync } from './api/PowerSyncConnector';
import { supabase } from './api/supabaseClient';
import { OrbitLoader, PageLoader } from '@/components/ui/orbit-loader';
const UnivCRM = React.lazy(() => import('@/components/universal/UnivCRM'));
const UnivProject = React.lazy(() => import('@/components/universal/UnivProject'));
const UnivContactManagement = React.lazy(() => import('@/components/universal/UnivContactManagement'));
const UnivKanban = React.lazy(() => import('@/components/universal/UnivKanban'));
const UnivDocument = React.lazy(() => import('@/components/universal/UnivDocument'));
const UnivInventory = React.lazy(() => import('@/components/universal/UnivInventory'));
const UnivHREmployee = React.lazy(() => import('@/components/universal/UnivHREmployee'));
const UnivHRSystem = React.lazy(() => import('@/components/universal/UnivHRSystem'));
const UnivInvoice = React.lazy(() => import('@/components/universal/UnivInvoice'));
const UnivPayroll = React.lazy(() => import('@/components/universal/UnivPayroll'));
const UnivRecruitment = React.lazy(() => import('@/components/universal/UnivRecruitment'));
const UnivAttendance = React.lazy(() => import('@/components/universal/UnivAttendance'));
const UnivLeaveManagement = React.lazy(() => import('@/components/universal/UnivLeaveManagement'));
const UnivPayment = React.lazy(() => import('@/components/universal/UnivPayment'));
const UnivAssetManagement = React.lazy(() => import('@/components/universal/UnivAssetManagement'));
const UnivProcurement = React.lazy(() => import('@/components/universal/UnivProcurement'));
const UnivAnalytics = React.lazy(() => import('@/components/universal/UnivAnalytics'));
const UnivBOM = React.lazy(() => import('@/components/universal/UnivBOM'));
const UnivBOQ = React.lazy(() => import('@/components/universal/UnivBOQ'));
const UnivBooking = React.lazy(() => import('@/components/universal/UnivBooking'));
const UnivCalendar = React.lazy(() => import('@/components/universal/UnivCalendar'));
const UnivCaseManagement = React.lazy(() => import('@/components/universal/UnivCaseManagement'));
const UnivClassAttendance = React.lazy(() => import('@/components/universal/UnivClassAttendance'));
const UnivClientPortal = React.lazy(() => import('@/components/universal/UnivClientPortal'));
const UnivContractor = React.lazy(() => import('@/components/universal/UnivContractor'));
const UnivCourse = React.lazy(() => import('@/components/universal/UnivCourse'));
const UnivCourtCalendar = React.lazy(() => import('@/components/universal/UnivCourtCalendar'));
const UnivDashboard = React.lazy(() => import('@/components/universal/UnivDashboard'));
const UnivDataGrid = React.lazy(() => import('@/components/universal/UnivDataGrid'));
const UnivDelivery = React.lazy(() => import('@/components/universal/UnivDelivery'));
const UnivDining = React.lazy(() => import('@/components/universal/UnivDining'));
const UnivDispatch = React.lazy(() => import('@/components/universal/UnivDispatch'));
const UnivEMR = React.lazy(() => import('@/components/universal/UnivEMR'));
const UnivFaculty = React.lazy(() => import('@/components/universal/UnivFaculty'));
const UnivFleet = React.lazy(() => import('@/components/universal/UnivFleet'));
const UnivForm = React.lazy(() => import('@/components/universal/UnivForm'));
const UnivGradebook = React.lazy(() => import('@/components/universal/UnivGradebook'));
const UnivHousekeeping = React.lazy(() => import('@/components/universal/UnivHousekeeping'));
const UnivLMS = React.lazy(() => import('@/components/universal/UnivLMS'));
const UnivLab = React.lazy(() => import('@/components/universal/UnivLab'));
const UnivLegalDocument = React.lazy(() => import('@/components/universal/UnivLegalDocument'));
const UnivAppointments = React.lazy(() => import('@/components/universal/UnivAppointments'));
const UnivMachine = React.lazy(() => import('@/components/universal/UnivMachine'));
const UnivMenu = React.lazy(() => import('@/components/universal/UnivMenu'));
const UnivMessaging = React.lazy(() => import('@/components/universal/UnivMessaging'));
const UnivNotification = React.lazy(() => import('@/components/universal/UnivNotification'));
const UnivParentPortal = React.lazy(() => import('@/components/universal/UnivParentPortal'));
const UnivPatient = React.lazy(() => import('@/components/universal/UnivPatient'));
const UnivPOS = React.lazy(() => import('@/components/universal/UnivPOS'));
const UnivPrescription = React.lazy(() => import('@/components/universal/UnivPrescription'));
const UnivProduction = React.lazy(() => import('@/components/universal/UnivProduction'));
const UnivQualityControl = React.lazy(() => import('@/components/universal/UnivQualityControl'));
const UnivRoom = React.lazy(() => import('@/components/universal/UnivRoom'));
const UnivRoute = React.lazy(() => import('@/components/universal/UnivRoute'));
const UnivSafety = React.lazy(() => import('@/components/universal/UnivSafety'));
const UnivSearch = React.lazy(() => import('@/components/universal/UnivSearch'));
const UnivSiteInspection = React.lazy(() => import('@/components/universal/UnivSiteInspection'));
const UnivStudent = React.lazy(() => import('@/components/universal/UnivStudent'));
const UnivSubscription = React.lazy(() => import('@/components/universal/UnivSubscription'));
const UnivTelemedicine = React.lazy(() => import('@/components/universal/UnivTelemedicine'));
const UnivTimeline = React.lazy(() => import('@/components/universal/UnivTimeline'));
const UnivWard = React.lazy(() => import('@/components/universal/UnivWard'));
const UnivWarehouse = React.lazy(() => import('@/components/universal/UnivWarehouse'));
const OptavelCommandCenter = React.lazy(() => import('@/pages/optavel/OptavelCommandCenter'));
const OptavelExecutive = React.lazy(() => import('@/pages/optavel/OptavelExecutive'));
const OptavelProductEng = React.lazy(() => import('@/pages/optavel/OptavelProductEng'));
const OptavelMarketing = React.lazy(() => import('@/pages/optavel/OptavelMarketing'));
const OptavelSales = React.lazy(() => import('@/pages/optavel/OptavelSales'));
const OptavelFinance = React.lazy(() => import('@/pages/optavel/OptavelFinance'));
const OptavelHR = React.lazy(() => import('@/pages/optavel/OptavelHR'));
const OptavelSupport = React.lazy(() => import('@/pages/optavel/OptavelSupport'));
const OptavelPartnerships = React.lazy(() => import('@/pages/optavel/OptavelPartnerships'));
const AdaptiveDashboard = React.lazy(() => import('@/pages/omnicore/AdaptiveDashboard'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isUpdating: false, updateProgress: 0 };
    this.handleUpdate = this.handleUpdate.bind(this);
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module') || error?.toString()?.includes('Failed to fetch dynamically imported module');
    if (isChunkError) {
      if (!sessionStorage.getItem('chunk-error-reload')) {
        sessionStorage.setItem('chunk-error-reload', 'true');
        // Force reload with cache bust
        window.location.href = window.location.pathname + '?v=' + new Date().getTime();
      }
    }
  }
  handleUpdate() {
    this.setState({ isUpdating: true, updateProgress: 0 });
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      if (p >= 100) {
        clearInterval(interval);
        this.setState({ updateProgress: 100 });
        
        // Clear caches and unregister service workers to break the loop
        if ('caches' in window) {
          caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
        }
        sessionStorage.removeItem('chunk-error-reload');
        
        setTimeout(() => {
          // Force cache bust on the root reload so it pulls fresh index.html
          window.location.href = '/dashboard?update=' + new Date().getTime();
        }, 150);
      } else {
        this.setState({ updateProgress: Math.min(p, 99) });
      }
    }, 150);
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Failed to fetch dynamically imported module') || this.state.error?.toString()?.includes('Failed to fetch dynamically imported module');
      
      if (isChunkError) {
        return (
          <div className="min-h-[100dvh] bg-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans">
            <div className="hidden md:flex bg-[#006065] p-8 md:p-12 rounded-[24px] border border-white/10 shadow-xl flex-col items-center text-center max-w-md w-full relative overflow-hidden text-white">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00beac]"></div>
              
              <div className="w-20 h-20 relative flex items-center justify-center mb-6">
                 <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                 <div className="absolute inset-0 rounded-full border-4 border-[#00beac] border-t-transparent animate-spin" />
                 {(() => {
                   let logoSrc = '/optavel-favicon.svg';
                   try {
                      const host = window.location.hostname.toLowerCase();
                      if (host.includes('clipad')) logoSrc = '/clipad-logo-green.svg';
                      else if (host.includes('slate') && !host.includes('optavel')) logoSrc = '/slate-favicon.svg';
                   } catch(e) {}
                   return <img src={logoSrc} alt="Logo" className="w-10 h-10 object-contain animate-pulse" />;
                 })()}
              </div>

              <h2 className="text-2xl font-black text-white mb-3">
                {this.state.isUpdating ? "Applying Update..." : "Updating Workspace"}
              </h2>
              <p className="text-white/80 mb-8 text-sm font-medium leading-relaxed">
                {this.state.isUpdating ? "Please wait while we install the newest features." : "We've just released a new update to improve your experience. Please refresh the page to load the latest version."}
              </p>
              
              {this.state.isUpdating ? (
                <div className="w-full bg-white/10 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div className="bg-[#00beac] h-2.5 rounded-full transition-all duration-200" style={{ width: `${this.state.updateProgress}%` }}></div>
                </div>
              ) : (
                <button 
                  onClick={this.handleUpdate} 
                  className="w-full py-4 px-6 bg-[#00beac] hover:bg-[#00beac]/90 text-[#00beac] font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Refresh Page
                </button>
              )}
            </div>

            {/* Native Mobile Version */}
            <div className="md:hidden flex flex-col items-center justify-center w-full max-w-sm mt-auto mb-auto">
               <div className="w-16 h-16 bg-[#006065] rounded-3xl shadow-xl border border-white/10 flex items-center justify-center mb-6 animate-bounce">
                  <svg className="w-8 h-8 text-[#fad503] animate-spin" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
               </div>
               <h2 className="text-xl font-bold text-white mb-2 text-center">
                 {this.state.isUpdating ? "Installing Update..." : "Update Available"}
               </h2>
               <p className="text-white/80 mb-8 text-sm font-medium leading-relaxed text-center px-4">
                 {this.state.isUpdating ? "Please wait, do not close the app." : "Tap to update to the newest features and bug fixes."}
               </p>
               
               {this.state.isUpdating ? (
                 <div className="w-full mb-4">
                   <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden shadow-inner">
                     <div className="bg-[#00beac] h-3 rounded-full transition-all duration-200" style={{ width: `${this.state.updateProgress}%` }}></div>
                   </div>
                   <div className="text-center text-xs text-white/70 font-bold mt-3">{this.state.updateProgress}%</div>
                 </div>
               ) : (
                 <button 
                   onClick={this.handleUpdate} 
                   className="w-full py-4 bg-[#00beac] text-[#00beac] font-bold rounded-2xl shadow-lg transition-transform active:scale-95"
                 >
                   Tap to Update Now
                 </button>
               )}
            </div>
          </div>
        );
      }

      return (
        <div style={{ padding: 20, color: 'red', background: '#ffebee', minHeight: '100vh' }}>
          <h2>Something went wrong in the UI.</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: 'white', color: 'red', border: '1px solid red', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: 16 }}>Reload App</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// Original Page imports
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Cases = React.lazy(() => import('./pages/Cases.jsx'));
const Clients = React.lazy(() => import('./pages/Clients.jsx'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Documents = React.lazy(() => import('./pages/Documents'));
const HCMSmartDocs = React.lazy(() => import('./pages/SmartDocs'));
const Team = React.lazy(() => import('./pages/Team'));

const Settings = React.lazy(() => import('./pages/Settings'));
const CustomFieldsSettings = React.lazy(() => import('./pages/settings/CustomFields'));
const Roles = React.lazy(() => import('@/pages/Roles'));
const Departments = React.lazy(() => import('@/pages/Departments'));
const ClientPortal = React.lazy(() => import('./pages/ClientPortal'));
const CaseDetail = React.lazy(() => import('./pages/CaseDetail'));
const StaffDashboard = React.lazy(() => import('./pages/StaffDashboard'));
const IntakeForm = React.lazy(() => import('./pages/IntakeForm'));
const NativeOnboarding = React.lazy(() => import('./pages/NativeOnboarding'));
const AppIntegrations = React.lazy(() => import('./pages/Integrations'));
const Automations = React.lazy(() => import('./pages/Automations'));
const Leads = React.lazy(() => import('./pages/Leads'));
const BillingDashboard = React.lazy(() => import('./pages/BillingDashboard'));
const PipelinePage = React.lazy(() => import('./pages/PipelinePage'));
const LegalResearch = React.lazy(() => import('./pages/LegalResearch'));
const AuditLog = React.lazy(() => import('./pages/AuditLog'));
const LeaveManagement = React.lazy(() => import('./pages/LeaveManagement'));

const ATS = React.lazy(() => import('./pages/hr/ATS'));
const Onboarding = React.lazy(() => import('./pages/hr/Onboarding'));
const Benefits = React.lazy(() => import('./pages/hr/Benefits'));
const Expenses = React.lazy(() => import('./pages/hr/Expenses'));
const Intranet = React.lazy(() => import('./pages/hr/Intranet'));
const HRAnalytics = React.lazy(() => import('./pages/hr/HRAnalytics'));
const PerformanceDashboard = React.lazy(() => import('./pages/PerformanceDashboard'));
const CaseOutcomes = React.lazy(() => import('./pages/CaseOutcomes'));
const ConflictChecker = React.lazy(() => import('./pages/ConflictChecker'));
const EmailInbox = React.lazy(() => import('./pages/EmailInbox'));
const ReportsDashboard = React.lazy(() => import('./pages/ReportsDashboard'));
const DataExport = React.lazy(() => import('./pages/DataExport'));
const WhatsAppMessenger = React.lazy(() => import('./pages/WhatsAppMessenger'));
const HRDashboard = React.lazy(() => import('./pages/HRDashboard'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Board = React.lazy(() => import('./pages/Board'));
const CustomPageViewer = React.lazy(() => import('./pages/CustomPageViewer'));
const OrbitComponentTester = React.lazy(() => import('./pages/admin/OrbitComponentTester'));
const TowerManager = React.lazy(() => import('./pages/TowerManager'));
const MasterPortalRouter = React.lazy(() => import('./components/portal/MasterPortalRouter'));

const PortalManagement = React.lazy(() => import('./pages/settings/PortalManagement'));
const TimeTracking = React.lazy(() => import('./pages/TimeTracking'));

// School Pages
const SchoolStudents = React.lazy(() => import('./pages/school/Students'));
const StudentProfile = React.lazy(() => import('./pages/school/StudentProfile'));
const SchoolParents = React.lazy(() => import('./pages/school/Parents'));
const SchoolTeachers = React.lazy(() => import('./pages/school/Teachers'));
const SchoolClasses = React.lazy(() => import('./pages/school/Classes'));
const SchoolTimetable = React.lazy(() => import('./pages/school/Timetable'));
const SchoolAssignments = React.lazy(() => import('./pages/school/Assignments'));
const SchoolDiscipline = React.lazy(() => import('./pages/school/Discipline'));
const SchoolNotices = React.lazy(() => import('./pages/school/Notices'));
const SchoolTransport = React.lazy(() => import('./pages/school/Transport'));
const SchoolHostel = React.lazy(() => import('./pages/school/Hostel'));
const SchoolAttendance = React.lazy(() => import('./pages/school/Attendance'));
const SchoolGrades = React.lazy(() => import('./pages/school/Grades'));
const SchoolExams = React.lazy(() => import('./pages/school/Exams'));
const SchoolFees = React.lazy(() => import('./pages/school/FeeManagement'));
const SchoolLibrary = React.lazy(() => import('./pages/school/Library'));
const SchoolParentPortal = React.lazy(() => import('./pages/school/ParentPortal'));
const SchoolStudentPortal = React.lazy(() => import('./pages/school/StudentPortal'));

const SchoolGamification = React.lazy(() => import('./pages/school/Gamification'));
const SchoolTeacherEvaluations = React.lazy(() => import('./pages/school/TeacherEvaluations'));
const SchoolCanteenPOS = React.lazy(() => import('./pages/school/CanteenPOS'));
const SchoolComplaints = React.lazy(() => import('./pages/school/Complaints'));
const SchoolSupportCenter = React.lazy(() => import('./pages/school/SupportCenter'));

const SchoolCampusMarketplace = React.lazy(() => import('./pages/school/CampusMarketplace'));
const SchoolInstitutionSettings = React.lazy(() => import('./pages/school/InstitutionSettings'));
// Hospital Pages
const HospitalPatients = React.lazy(() => import('./pages/hospital/Patients'));
const HospitalAppointments = React.lazy(() => import('./pages/hospital/Appointments'));
const HospitalWards = React.lazy(() => import('./pages/hospital/Wards'));
const HospitalPrescriptions = React.lazy(() => import('./pages/hospital/Prescriptions'));
const HospitalLabResults = React.lazy(() => import('./pages/hospital/LabResults'));
const HospitalPharmacy = React.lazy(() => import('./pages/hospital/Pharmacy'));
const HospitalPatientPortal = React.lazy(() => import('./pages/hospital/PatientPortal'));
const HospitalBilling = React.lazy(() => import('./pages/hospital/HospitalBilling'));
const HospitalClaims = React.lazy(() => import('./pages/hospital/HospitalClaims'));
const HospitalTelemedicine = React.lazy(() => import('./pages/hospital/Telemedicine'));
const HospitalOperationTheater = React.lazy(() => import('./pages/hospital/OperationTheater'));
const HospitalRadiology = React.lazy(() => import('./pages/hospital/Radiology'));
const HospitalAmbulanceDispatch = React.lazy(() => import('./pages/hospital/AmbulanceDispatch'));
const HospitalReferrals = React.lazy(() => import('./pages/hospital/Referrals'));
const HospitalBloodBank = React.lazy(() => import('./pages/hospital/BloodBank'));
const HospitalQueue = React.lazy(() => import('./pages/hospital/Queue'));
const HospitalStaffRoster = React.lazy(() => import('./pages/hospital/StaffRoster'));
const HospitalInfectionControl = React.lazy(() => import('./pages/hospital/InfectionControl'));


// Hotel Pages
const HotelFrontDesk = React.lazy(() => import('./pages/hotel/FrontDesk'));
const HotelReservations = React.lazy(() => import('./pages/hotel/Reservations'));
const HotelRooms = React.lazy(() => import('./pages/hotel/Rooms'));
const HotelHousekeeping = React.lazy(() => import('./pages/hotel/Housekeeping'));
const HotelRevenueManagement = React.lazy(() => import('./pages/hotel/RevenueManagement'));
const HotelLoyalty = React.lazy(() => import('./pages/hotel/Loyalty'));
const HotelRestaurant = React.lazy(() => import('./pages/hotel/Restaurant'));
const HotelGuestRequests = React.lazy(() => import('./pages/hotel/GuestRequests'));
const HotelGuestPortal = React.lazy(() => import('./pages/hotel/GuestPortal'));
const HotelGuests = React.lazy(() => import('./pages/hotel/Guests'));

// Pharmacy Pages
const PharmacyDashboard = React.lazy(() => import('./pages/pharmacy/Dashboard'));
const PharmacyPOS = React.lazy(() => import('./pages/pharmacy/POS'));
const PharmacyPrescriptions = React.lazy(() => import('./pages/pharmacy/Prescriptions'));
const PharmacyCustomers = React.lazy(() => import('./pages/pharmacy/Customers'));
const PharmacyDrugs = React.lazy(() => import('./pages/pharmacy/Drugs'));
const PharmacyInventory = React.lazy(() => import('./pages/pharmacy/Inventory'));
const PharmacyClaims = React.lazy(() => import('./pages/pharmacy/Claims'));
const PharmacyReports = React.lazy(() => import('./pages/pharmacy/Reports'));

// Real Estate Pages
const RealEstateDashboard = React.lazy(() => import('./pages/real-estate/RealEstateDashboard'));
const RealEstateProperties = React.lazy(() => import('./pages/real-estate/Properties'));
const RealEstateClients = React.lazy(() => import('./pages/real-estate/Clients'));
const RealEstateLeases = React.lazy(() => import('./pages/real-estate/Leases'));
const RealEstateViewings = React.lazy(() => import('./pages/real-estate/Viewings'));
const RealEstateTransactions = React.lazy(() => import('./pages/real-estate/Transactions'));
const RealEstateOffers = React.lazy(() => import('./pages/real-estate/Offers'));
const RealEstateCommissions = React.lazy(() => import('./pages/real-estate/Commissions'));
const RealEstateRentPayments = React.lazy(() => import('./pages/real-estate/RentPayments'));
const RealEstateMaintenance = React.lazy(() => import('./pages/real-estate/Maintenance'));
const RealEstateCRMLeads = React.lazy(() => import('./pages/real-estate/CRMLeads'));
const RealEstateAgentMetrics = React.lazy(() => import('./pages/real-estate/AgentMetrics'));
const RealEstateAuditLog = React.lazy(() => import('./pages/real-estate/AuditLog'));
const RealEstateCommissionRules = React.lazy(() => import('./pages/real-estate/CommissionRules'));
const RealEstateComparableProperties = React.lazy(() => import('./pages/real-estate/ComparableProperties'));
const RealEstateContractorReviews = React.lazy(() => import('./pages/real-estate/ContractorReviews'));
const RealEstateContractors = React.lazy(() => import('./pages/real-estate/Contractors'));
const RealEstateCounterOffers = React.lazy(() => import('./pages/real-estate/CounterOffers'));
const RealEstateDocumentTemplates = React.lazy(() => import('./pages/real-estate/DocumentTemplates'));
const RealEstateESignatures = React.lazy(() => import('./pages/real-estate/ESignatures'));
const RealEstateEscrowAccounts = React.lazy(() => import('./pages/real-estate/EscrowAccounts'));
const RealEstateLeaseRenewals = React.lazy(() => import('./pages/real-estate/LeaseRenewals'));
const RealEstateMarketData = React.lazy(() => import('./pages/real-estate/MarketData'));
const RealEstateMarketIntelligence = React.lazy(() => import('./pages/real-estate/MarketIntelligence'));
const RealEstatePaymentSchedules = React.lazy(() => import('./pages/real-estate/PaymentSchedules'));
const RealEstateRecommendations = React.lazy(() => import('./pages/real-estate/Recommendations'));
const RealEstateTeamManagement = React.lazy(() => import('./pages/real-estate/TeamManagement'));
const RealEstateTrustAccounting = React.lazy(() => import('./pages/real-estate/TrustAccounting'));
const FirmAccountingHub = React.lazy(() => import('./pages/finance/FirmAccountingHub'));
const SmartFirmAccountingRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <FirmAccountingHub />;
  return <Navigate to="/" replace />;
};
const RealEstateAnalytics = React.lazy(() => import('./pages/real-estate/Analytics'));

// JCL Royal Group — Dedicated Isolated Vertical Components
const JCLLandManagement = React.lazy(() => import('./pages/real-estate-jcl/LandManagement'));
const JCLCustomerTimeline = React.lazy(() => import('./pages/real-estate-jcl/CustomerTimeline'));
const JCLCrmLeadsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLCrmLeads'));
const JCLClientsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLClients'));
const JCLDashboardPage = React.lazy(() => import('./pages/real-estate-jcl/JCLDashboard'));
const JCLPropertiesPage = React.lazy(() => import('./pages/real-estate-jcl/JCLProperties'));
const JCLTransactionsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLTransactions'));
const JCLViewingsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLViewings'));
const JCLLeasesPage = React.lazy(() => import('./pages/real-estate-jcl/JCLLeases'));
const JCLOffersPage = React.lazy(() => import('./pages/real-estate-jcl/JCLOffers'));

const SmartRealEstateDashboard = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLDashboardPage />;
  return <RealEstateDashboard />;
};

const SmartClientsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLClientsPage />;
  return <RealEstateClients />;
};

const SmartLeadsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLCrmLeadsPage />;
  return <RealEstateCRMLeads />;
};

const SmartPropertiesRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLPropertiesPage />;
  return <RealEstateProperties />;
};

const SmartTransactionsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLTransactionsPage />;
  return <RealEstateTransactions />;
};

const SmartViewingsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLViewingsPage />;
  return <RealEstateViewings />;
};

const SmartLeasesRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLLeasesPage />;
  return <RealEstateLeases />;
};

const JCLTrustAccountingPage = React.lazy(() => import('./pages/real-estate-jcl/JCLTrustAccounting'));
const JCLEscrowAccountsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLEscrowAccounts'));
const JCLDocumentTemplatesPage = React.lazy(() => import('./pages/real-estate-jcl/JCLDocumentTemplates'));
const JCLESignaturesPage = React.lazy(() => import('./pages/real-estate-jcl/JCLESignatures'));
const JCLCommissionRulesPage = React.lazy(() => import('./pages/real-estate-jcl/JCLCommissionRules'));
const JCLAuditLogPage = React.lazy(() => import('./pages/real-estate-jcl/JCLAuditLog'));

const SmartDocumentTemplatesRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLDocumentTemplatesPage />;
  return <RealEstateDocumentTemplates />;
};

const SmartESignaturesRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLESignaturesPage />;
  return <RealEstateESignatures />;
};

const SmartCommissionRulesRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLCommissionRulesPage />;
  return <RealEstateCommissionRules />;
};

const SmartAuditLogRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLAuditLogPage />;
  return <RealEstateAuditLog />;
};
const JCLContractorsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLContractors'));
const JCLContractorReviewsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLContractorReviews'));
const JCLLeaseRenewalsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLLeaseRenewals'));
const JCLMaintenancePage = React.lazy(() => import('./pages/real-estate-jcl/JCLMaintenance'));
const JCLMarketerTrackerPage = React.lazy(() => import('./pages/real-estate-jcl/JCLMarketerTracker'));

const SmartMaintenanceRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLMaintenancePage />;
  return <RealEstateMaintenance />;
};

const SmartContractorsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLContractorsPage />;
  return <RealEstateContractors />;
};

const SmartContractorReviewsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLContractorReviewsPage />;
  return <RealEstateContractorReviews />;
};

const SmartLeaseRenewalsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLLeaseRenewalsPage />;
  return <RealEstateLeaseRenewals />;
};
const JCLAnalyticsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLAnalytics'));
const JCLCommissionsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLCommissions'));
const JCLCounterOffersPage = React.lazy(() => import('./pages/real-estate-jcl/JCLCounterOffers'));
const JCLPaymentSchedulesPage = React.lazy(() => import('./pages/real-estate-jcl/JCLPaymentSchedules'));
const JCLRentPaymentsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLRentPayments'));

const SmartOffersRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLOffersPage />;
  return <RealEstateOffers />;
};

const SmartCounterOffersRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLCounterOffersPage />;
  return <RealEstateCounterOffers />;
};

const SmartPaymentSchedulesRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLPaymentSchedulesPage />;
  return <RealEstatePaymentSchedules />;
};

const SmartRentPaymentsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLRentPaymentsPage />;
  return <RealEstateRentPayments />;
};

const SmartTrustAccountingRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLTrustAccountingPage />;
  if (ind === 'real_estate') return <RealEstateTrustAccounting />;
  return <JCLTrustAccountingPage />;
};

const SmartEscrowAccountsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLEscrowAccountsPage />;
  return <RealEstateEscrowAccounts />;
};

const SmartCommissionsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLCommissionsPage />;
  return <RealEstateCommissions />;
};

const SmartAnalyticsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLAnalyticsPage />;
  return <RealEstateAnalytics />;
};

const JCLComparablePropertiesPage = React.lazy(() => import('./pages/real-estate-jcl/JCLComparableProperties'));
const JCLMarketDataPage = React.lazy(() => import('./pages/real-estate-jcl/JCLMarketData'));
const JCLTenantPortalPage = React.lazy(() => import('./pages/real-estate-jcl/JCLTenantPortal'));
const JCLLandlordPortalPage = React.lazy(() => import('./pages/real-estate-jcl/JCLLandlordPortal'));
const JCLTeamManagementPage = React.lazy(() => import('./pages/real-estate-jcl/JCLTeamManagement'));
const JCLAgentMetricsPage = React.lazy(() => import('./pages/real-estate-jcl/JCLAgentMetrics'));

const SmartComparablePropertiesRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLComparablePropertiesPage />;
  return <RealEstateComparableProperties />;
};

const SmartMarketDataRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLMarketDataPage />;
  return <RealEstateMarketData />;
};

const SmartTenantPortalRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLTenantPortalPage />;
  return <RealEstateTenantPortal />;
};

const SmartLandlordPortalRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLLandlordPortalPage />;
  return <RealEstateLandlordPortal />;
};

const SmartTeamManagementRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLTeamManagementPage />;
  return <RealEstateTeamManagement />;
};

const SmartAgentMetricsRouter = () => {
  const { user } = useAuth();
  const ind = sessionStorage.getItem('slate_industry_override') || user?.company_industry;
  if (ind === 'real_estate_jcl') return <JCLAgentMetricsPage />;
  return <RealEstateAgentMetrics />;
};

// Religion Pages
const ReligionMembers = React.lazy(() => import('./pages/religion/Members'));
const ReligionGroups = React.lazy(() => import('./pages/religion/Groups'));
const ReligionEvents = React.lazy(() => import('./pages/religion/Events'));
const ReligionDonations = React.lazy(() => import('./pages/religion/Donations'));
const ReligionVolunteers = React.lazy(() => import('./pages/religion/Volunteers'));
const ReligionSermons = React.lazy(() => import('./pages/religion/Sermons'));
const ReligionSmallGroups = React.lazy(() => import('./pages/religion/SmallGroups'));
const ReligionPrayers = React.lazy(() => import('./pages/religion/Prayers'));
const ReligionMemberPortal = React.lazy(() => import('./pages/religion/MemberPortal'));
const ReligionMilestones = React.lazy(() => import('./pages/religion/Milestones'));

// Insurance Pages
const InsurancePolicies = React.lazy(() => import('./pages/insurance/Policies'));
const InsuranceClaims = React.lazy(() => import('./pages/insurance/Claims'));
const InsuranceClients = React.lazy(() => import('./pages/insurance/Clients'));
const InsurancePolicyholderPortal = React.lazy(() => import('./pages/insurance/PolicyholderPortal'));
const InsuranceUnderwriting = React.lazy(() => import('./pages/insurance/Underwriting'));
const ActuarialDashboard = React.lazy(() => import('./pages/insurance/ActuarialDashboard'));
const Reinsurance = React.lazy(() => import('./pages/insurance/Reinsurance'));
const InsuranceAgentPerformance = React.lazy(() => import('./pages/insurance/AgentPerformance'));
const InsurancePremiums = React.lazy(() => import('./pages/insurance/Premiums'));

// Retail Pages
const RetailDashboard = React.lazy(() => import('./pages/retail/RetailDashboard'));
const RetailPurchaseOrders = React.lazy(() => import('./pages/retail/PurchaseOrders'));
const RetailPromotions = React.lazy(() => import('./pages/retail/Promotions'));
const RetailInventory = React.lazy(() => import('./pages/retail/Inventory'));
const RetailPOS = React.lazy(() => import('./pages/retail/POS'));
const RetailSales = React.lazy(() => import('./pages/retail/Sales'));
const RetailSuppliers = React.lazy(() => import('./pages/retail/Suppliers'));
const Products = React.lazy(() => import('./pages/retail/Products'));
const Orders = React.lazy(() => import('./pages/retail/Orders'));
const Loyalty = React.lazy(() => import('./pages/retail/Loyalty'));
const Shifts = React.lazy(() => import('./pages/retail/Shifts'));
const RetailCustomers = React.lazy(() => import('./pages/retail/Customers'));
const RetailCustomerPortal = React.lazy(() => import('./pages/retail/CustomerPortal'));

const BarcodeManagement = React.lazy(() => import('./pages/retail/BarcodeManagement'));
const RMAManagement = React.lazy(() => import('./pages/retail/RMAManagement'));
const OnlineStoreBuilder = React.lazy(() => import('./pages/retail/OnlineStoreBuilder'));
const B2BWholesalePortal = React.lazy(() => import('./pages/retail/B2BWholesalePortal'));
const FranchiseManager = React.lazy(() => import('./pages/retail/FranchiseManager'));


// Logistics Pages
const SmartDocs = React.lazy(() => import('./pages/logistics/SmartDocs'));
const RouteOptimization = React.lazy(() => import('./pages/logistics/RouteOptimization'));
const LoadBoard = React.lazy(() => import('./pages/logistics/LoadBoard'));
const GeofenceAlerts = React.lazy(() => import('./pages/logistics/GeofenceAlerts'));
const LogisticsShipments = React.lazy(() => import('./pages/logistics/Shipments'));
const Pickups = React.lazy(() => import('./pages/logistics/Pickups'));
const LogisticsFleet = React.lazy(() => import('./pages/logistics/Fleet'));
const LogisticsDrivers = React.lazy(() => import('./pages/logistics/Drivers'));
const LogisticsTrackingPortal = React.lazy(() => import('./pages/logistics/TrackingPortal'));
const LogisticsWarehouse = React.lazy(() => import('./pages/logistics/Warehouse'));
const LogisticsRouteOptimization = React.lazy(() => import('./pages/logistics/RouteOptimization'));
const LogisticsProofOfDelivery = React.lazy(() => import('./pages/logistics/ProofOfDelivery'));
const LogisticsIncidentManagement = React.lazy(() => import('./pages/logistics/IncidentManagement'));
const LogisticsReturnsManagement = React.lazy(() => import('./pages/retail/RMAManagement'));
const LogisticsAdvancedAnalytics = React.lazy(() => import('./pages/logistics/AdvancedAnalytics'));
const LogisticsDriverMobileApp = React.lazy(() => import('./pages/logistics/DriverMobileApp'));

// HR Pages
const HREmployees = React.lazy(() => import('./pages/hr/Employees'));
const HRRecruitment = React.lazy(() => import('./pages/hr/Recruitment'));
const HRPayroll = React.lazy(() => import('./pages/hr/Payroll'));
const HRLeave = React.lazy(() => import('./pages/hr/Leave'));
const HRDepartments = React.lazy(() => import('./pages/hr/Departments'));
const HRRoles = React.lazy(() => import('./pages/hr/Roles'));
const HRAttendance = React.lazy(() => import('./pages/hr/Attendance'));
const HRPerformance = React.lazy(() => import('./pages/hr/Performance'));
const HRTraining = React.lazy(() => import('./pages/hr/Training'));
const HRComplaints = React.lazy(() => import('./pages/hr/Complaints'));
const HRPromotions = React.lazy(() => import('./pages/hr/Promotions'));
const HRSalary = React.lazy(() => import('./pages/hr/Salary'));

// Layout
import AppLayout from './components/layout/AppLayout';
const Login = React.lazy(() => import('./pages/Login'));
const SignUp = React.lazy(() => import('./pages/SignUp'));
const ForceResetPassword = React.lazy(() => import('./pages/ForceResetPassword'));
const SSOGateway = React.lazy(() => import('./pages/auth/SSOGateway'));
const SSOCallback = React.lazy(() => import('./pages/auth/SSOCallback'));
const GoogleCallback = React.lazy(() => import('./pages/auth/GoogleCallback'));
import AccountPortalLayout from './components/layout/AccountPortalLayout';
const AccountPortal = React.lazy(() => import('./pages/auth/AccountPortal'));
const AccountSecurity = React.lazy(() => import('./pages/auth/AccountSecurity'));
const AccountPersonalInfo = React.lazy(() => import('./pages/auth/AccountPersonalInfo'));
const AccountPayments = React.lazy(() => import('./pages/auth/AccountPayments'));
const AccountDevices = React.lazy(() => import('./pages/auth/AccountDevices'));
const AccountHelp = React.lazy(() => import('./pages/auth/AccountHelp'));
const AccountDocs = React.lazy(() => import('./pages/auth/AccountDocs'));
const AccountTutorials = React.lazy(() => import('./pages/auth/AccountTutorials'));
const SuperAdminDashboard = React.lazy(() => import('./pages/auth/SuperAdminDashboard'));
const AccountLogin = React.lazy(() => import('./pages/auth/AccountLogin'));
const AccountSignUp = React.lazy(() => import('./pages/auth/AccountSignUp'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
import { SiteDomainResolver } from '@/components/sites/SiteRenderer/SiteDomainResolver';
const SlateSites = React.lazy(() => import('./pages/sites/SlateSites'));
const SiteBuilderPage = React.lazy(() => import('./pages/sites/SiteBuilderPage'));
import { getSubdomainAndBase } from '@/lib/domainUtils';

// University Pages
const UniDashboard = React.lazy(() => import('./pages/university/UniDashboard'));
const UniStudents = React.lazy(() => import('./pages/university/UniStudents'));
const UniFaculties = React.lazy(() => import('./pages/university/UniFaculties'));
const UniCourses = React.lazy(() => import('./pages/university/UniCourses'));
const UniAdmissions = React.lazy(() => import('./pages/university/UniAdmissions'));
const UniFinance = React.lazy(() => import('./pages/university/UniFinance'));
const UniEnrollment = React.lazy(() => import('./pages/university/UniEnrollment'));
const UniRevenue = React.lazy(() => import('./pages/university/UniRevenue'));
const UniResearchActivity = React.lazy(() => import('./pages/university/UniResearchActivity'));
const UniGraduationStats = React.lazy(() => import('./pages/university/UniGraduationStats'));
const UniAcademicStructure = React.lazy(() => import('./pages/university/UniAcademicStructure'));
const UniRegistration = React.lazy(() => import('./pages/university/UniRegistration'));
const UniLMS = React.lazy(() => import('./pages/university/UniLMS'));
const UniExams = React.lazy(() => import('./pages/university/UniExams'));
const UniHostel = React.lazy(() => import('./pages/university/UniHostel'));
const UniLibrary = React.lazy(() => import('./pages/university/UniLibrary'));
const UniCareerAlumni = React.lazy(() => import('./pages/university/UniCareerAlumni'));

// ----- Logistics Features -----
const DispatchBoard = React.lazy(() => import('./pages/logistics/DispatchBoard'));
const Warehouse = React.lazy(() => import('./pages/logistics/Warehouse'));

// Vocational Pages
const VDashboard = React.lazy(() => import('./pages/vocational/VDashboard'));
const VTrades = React.lazy(() => import('./pages/vocational/VTrades'));
const VCourses = React.lazy(() => import('./pages/vocational/VCourses'));
const VWorkshops = React.lazy(() => import('./pages/vocational/VWorkshops'));
const VPracticalModules = React.lazy(() => import('./pages/vocational/VPracticalModules'));
const VTraineeProfiles = React.lazy(() => import('./pages/vocational/VTraineeProfiles'));
const VTrainingProgress = React.lazy(() => import('./pages/vocational/VTrainingProgress'));
const VWorkshopAssessments = React.lazy(() => import('./pages/vocational/VWorkshopAssessments'));
const VPracticalExams = React.lazy(() => import('./pages/vocational/VPracticalExams'));
const VSkillDemonstrations = React.lazy(() => import('./pages/vocational/VSkillDemonstrations'));
const VCompetencyTracking = React.lazy(() => import('./pages/vocational/VCompetencyTracking'));
const VEquipmentInventory = React.lazy(() => import('./pages/vocational/VEquipmentInventory'));
const VEquipmentReservations = React.lazy(() => import('./pages/vocational/VEquipmentReservations'));
const VMaintenance = React.lazy(() => import('./pages/vocational/VMaintenance'));
const VInternshipTracking = React.lazy(() => import('./pages/vocational/VInternshipTracking'));
const VIndustrialAttachments = React.lazy(() => import('./pages/vocational/VIndustrialAttachments'));
const VEmployerEvaluations = React.lazy(() => import('./pages/vocational/VEmployerEvaluations'));
const VCertificates = React.lazy(() => import('./pages/vocational/VCertificates'));
const VSkillBadges = React.lazy(() => import('./pages/vocational/VSkillBadges'));
const VQualificationTracking = React.lazy(() => import('./pages/vocational/VQualificationTracking'));
const VJobOpportunities = React.lazy(() => import('./pages/vocational/VJobOpportunities'));
const VEmployers = React.lazy(() => import('./pages/vocational/VEmployers'));
const VPlacementReports = React.lazy(() => import('./pages/vocational/VPlacementReports'));
const VCertificationRates = React.lazy(() => import('./pages/vocational/VCertificationRates'));
const VEmploymentRates = React.lazy(() => import('./pages/vocational/VEmploymentRates'));
const VCoursePerformance = React.lazy(() => import('./pages/vocational/VCoursePerformance'));

// Online Learning Pages
const OnlineDashboard = React.lazy(() => import('./pages/online/OnlineDashboard'));
const OnlineLearners = React.lazy(() => import('./pages/online/OnlineLearners'));
const OnlineCourses = React.lazy(() => import('./pages/online/OnlineCourses'));
const OnlineSales = React.lazy(() => import('./pages/online/OnlineSales'));
const OnlineMarketplace = React.lazy(() => import('./pages/online/OnlineMarketplace'));
const CourseDetails = React.lazy(() => import('./pages/online/CourseDetails'));
const InstructorProfile = React.lazy(() => import('./pages/online/InstructorProfile'));
const OnlineBuilder = React.lazy(() => import('./pages/online/OnlineBuilder'));
const LessonBuilder = React.lazy(() => import('./pages/online/LessonBuilder'));
const AssessmentBuilder = React.lazy(() => import('./pages/online/AssessmentBuilder'));
const MediaManager = React.lazy(() => import('./pages/online/MediaManager'));
const LearningPlayer = React.lazy(() => import('./pages/online/LearningPlayer'));
const StudentDashboard = React.lazy(() => import('./pages/online/StudentDashboard'));
const LearnerProfile = React.lazy(() => import('./pages/online/LearnerProfile'));
const NotesCenter = React.lazy(() => import('./pages/online/NotesCenter'));
const OnlineAssessments = React.lazy(() => import('./pages/online/OnlineAssessments'));
const OnlineCertificates = React.lazy(() => import('./pages/online/OnlineCertificates'));
const UnifiedInbox = React.lazy(() => import('./pages/UnifiedInbox'));
const OnlineLive = React.lazy(() => import('./pages/online/OnlineLive'));
const Checkout = React.lazy(() => import('./pages/online/Checkout'));
const OnlineSubscriptions = React.lazy(() => import('./pages/online/OnlineSubscriptions'));
const OnlineAffiliates = React.lazy(() => import('./pages/online/OnlineAffiliates'));
const CorporateDashboard = React.lazy(() => import('./pages/online/CorporateDashboard'));
const OnlineCommunity = React.lazy(() => import('./pages/online/OnlineCommunity'));
const OrbitAIAssistant = React.lazy(() => import('./pages/online/OrbitAIAssistant'));

// High School Pages
const SHSClasses = React.lazy(() => import('./pages/highschool/SHSClasses'));
const SHSStudents = React.lazy(() => import('./pages/highschool/SHSStudents'));
const SHSProgrammes = React.lazy(() => import('./pages/highschool/SHSProgrammes'));
const SHSHouses = React.lazy(() => import('./pages/highschool/SHSHouses'));
const SHSTimetable = React.lazy(() => import('./pages/highschool/SHSTimetable'));
const SHSAdmissions = React.lazy(() => import('./pages/highschool/SHSAdmissions'));
const SHSGrades = React.lazy(() => import('./pages/highschool/SHSGrades'));
const SHSFees = React.lazy(() => import('./pages/highschool/SHSFees'));
const SHSDashboard = React.lazy(() => import('./pages/highschool/SHSDashboard'));
const SHSStudentProfiles = React.lazy(() => import('./pages/highschool/SHSStudentProfiles'));
const SHSStudentPromotion = React.lazy(() => import('./pages/highschool/SHSStudentPromotion'));
const SHSStudentTransfers = React.lazy(() => import('./pages/highschool/SHSStudentTransfers'));
const SHSDisciplineRecords = React.lazy(() => import('./pages/highschool/SHSDisciplineRecords'));
const SHSMedicalRecords = React.lazy(() => import('./pages/highschool/SHSMedicalRecords'));
const SHSApplicantReview = React.lazy(() => import('./pages/highschool/SHSApplicantReview'));
const SHSAdmissionDecisions = React.lazy(() => import('./pages/highschool/SHSAdmissionDecisions'));
const SHSEnrollment = React.lazy(() => import('./pages/highschool/SHSEnrollment'));
const SHSStreams = React.lazy(() => import('./pages/highschool/SHSStreams'));
const SHSSubjects = React.lazy(() => import('./pages/highschool/SHSSubjects'));
const SHSElectives = React.lazy(() => import('./pages/highschool/SHSElectives'));
const SHSAcademicCalendar = React.lazy(() => import('./pages/highschool/SHSAcademicCalendar'));
const SHSDailyAttendance = React.lazy(() => import('./pages/highschool/SHSDailyAttendance'));
const SHSClassAttendance = React.lazy(() => import('./pages/highschool/SHSClassAttendance'));
const SHSTeacherAttendance = React.lazy(() => import('./pages/highschool/SHSTeacherAttendance'));
const SHSAttendanceReports = React.lazy(() => import('./pages/highschool/SHSAttendanceReports'));
const SHSInternalExams = React.lazy(() => import('./pages/highschool/SHSInternalExams'));
const SHSMockExams = React.lazy(() => import('./pages/highschool/SHSMockExams'));
const SHSContinuousAssessment = React.lazy(() => import('./pages/highschool/SHSContinuousAssessment'));
const SHSResultsProcessing = React.lazy(() => import('./pages/highschool/SHSResultsProcessing'));
const SHSReportCards = React.lazy(() => import('./pages/highschool/SHSReportCards'));
const SHSDormitories = React.lazy(() => import('./pages/highschool/SHSDormitories'));
const SHSRoomAllocation = React.lazy(() => import('./pages/highschool/SHSRoomAllocation'));
const SHSHouseMasters = React.lazy(() => import('./pages/highschool/SHSHouseMasters'));
const SHSBoardingAttendance = React.lazy(() => import('./pages/highschool/SHSBoardingAttendance'));
const SHSParentProgress = React.lazy(() => import('./pages/highschool/SHSParentProgress'));
const SHSParentAttendance = React.lazy(() => import('./pages/highschool/SHSParentAttendance'));
const SHSParentFees = React.lazy(() => import('./pages/highschool/SHSParentFees'));
const SHSParentComms = React.lazy(() => import('./pages/highschool/SHSParentComms'));
const SHSInvoices = React.lazy(() => import('./pages/highschool/SHSInvoices'));
const SHSPayments = React.lazy(() => import('./pages/highschool/SHSPayments'));
const SHSScholarships = React.lazy(() => import('./pages/highschool/SHSScholarships'));
const SHSFinancialReports = React.lazy(() => import('./pages/highschool/SHSFinancialReports'));
const SHSBooks = React.lazy(() => import('./pages/highschool/SHSBooks'));
const SHSBorrowing = React.lazy(() => import('./pages/highschool/SHSBorrowing'));
const SHSReturns = React.lazy(() => import('./pages/highschool/SHSReturns'));
const SHSDigitalResources = React.lazy(() => import('./pages/highschool/SHSDigitalResources'));
const SHSBuses = React.lazy(() => import('./pages/highschool/SHSBuses'));
const OrbitBuildPage = React.lazy(() => import('./pages/OrbitBuildPage'));
const SHSRoutes = React.lazy(() => import('./pages/highschool/SHSRoutes'));
const SHSStudentAssignments = React.lazy(() => import('./pages/highschool/SHSStudentAssignments'));
const SHSNotices = React.lazy(() => import('./pages/highschool/SHSNotices'));
const SHSSMS = React.lazy(() => import('./pages/highschool/SHSSMS'));
const SHSWhatsApp = React.lazy(() => import('./pages/highschool/SHSWhatsApp'));
const SHSEmailComms = React.lazy(() => import('./pages/highschool/SHSEmailComms'));
const SHSAcademicAnalytics = React.lazy(() => import('./pages/highschool/SHSAcademicAnalytics'));
const SHSAttendanceAnalytics = React.lazy(() => import('./pages/highschool/SHSAttendanceAnalytics'));
const SHSFinancialAnalytics = React.lazy(() => import('./pages/highschool/SHSFinancialAnalytics'));

import MarketingLayout from './components/layout/MarketingLayout';
const Home = React.lazy(() => import('./pages/marketing/Home'));
const Features = React.lazy(() => import('./pages/marketing/Features'));
const Pricing = React.lazy(() => import('./pages/marketing/Pricing'));
const About = React.lazy(() => import('./pages/marketing/About'));
const Contact = React.lazy(() => import('./pages/marketing/Contact'));
const EnterpriseContact = React.lazy(() => import('./pages/marketing/EnterpriseContact'));
const Integrations = React.lazy(() => import('./pages/marketing/Integrations'));
const Changelog = React.lazy(() => import('./pages/marketing/Changelog'));
const Customers = React.lazy(() => import('./pages/marketing/Customers'));
const Security = React.lazy(() => import('./pages/marketing/Security'));
const Solutions = React.lazy(() => import('./pages/marketing/Solutions'));
const RoiCalculator = React.lazy(() => import('./pages/marketing/RoiCalculator'));

const Partners = React.lazy(() => import('./pages/marketing/Partners'));
const LegalDocs = React.lazy(() => import('./pages/marketing/LegalDocs'));
const OnboardingWizard = React.lazy(() => import('./pages/OnboardingWizard'));
const GenericModulePage = React.lazy(() => import('./pages/GenericModulePage'));
const CreateModulePage = React.lazy(() => import('./pages/CreateModulePage'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));

// Admin Ecosystem Pages
const AdminOverview = React.lazy(() => import('./pages/admin/AdminOverview'));
const AdminFirms = React.lazy(() => import('./pages/admin/AdminFirms'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminBilling = React.lazy(() => import('./pages/admin/AdminBilling'));

import SuperAdminBilling from './components/orbitbolt/SuperAdminBilling';
const AdminSecurity = React.lazy(() => import('./pages/admin/AdminSecurity'));
const AdminBroadcasts = React.lazy(() => import('./pages/admin/AdminBroadcasts'));
const AdminIntelligence = React.lazy(() => import('./pages/admin/AdminIntelligence'));
const AdminRollout = React.lazy(() => import('./pages/admin/AdminRollout'));
const AdminQuotas = React.lazy(() => import('./pages/admin/AdminQuotas'));
const AdminEnterpriseRequests = React.lazy(() => import('./pages/admin/AdminEnterpriseRequests'));
const AdminPartners = React.lazy(() => import('./pages/admin/AdminPartners'));
const NotificationsInbox = React.lazy(() => import('./pages/NotificationsInbox'));
const FeatureLab = React.lazy(() => import('./pages/FeatureLab'));
const FeatureVault = React.lazy(() => import('./pages/FeatureVault'));
const AdminFeatureInsider = React.lazy(() => import('./pages/admin/AdminFeatureInsider'));

function PlatformRoutes() {
  return (
    <>
      {/* Core / Shared Pages */}
      <Route path="/ob/:pageName" element={<OrbitBuildPage />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/omnicore/dashboard" element={<AdaptiveDashboard />} />
      <Route path="/v2/dashboard" element={<AdaptiveDashboard />} />
      <Route path="/custom-pricing" element={<CliPadCustomPricing />} />
      <Route path="/pricing/custom" element={<CliPadCustomPricing />} />
      
      {/* Optavel OS Routes */}
      <Route path="/optavel" element={<OptavelCommandCenter />} />
      <Route path="/optavel/executive" element={<OptavelExecutive />} />
      <Route path="/optavel/product" element={<OptavelProductEng />} />
      <Route path="/optavel/marketing" element={<OptavelMarketing />} />
      <Route path="/optavel/sales" element={<OptavelSales />} />
      <Route path="/optavel/finance" element={<OptavelFinance />} />
      <Route path="/optavel/hr" element={<OptavelHR />} />
      <Route path="/optavel/support" element={<OptavelSupport />} />
      <Route path="/optavel/partnerships" element={<OptavelPartnerships />} />

      <Route path="/intelligence" element={<Intelligence />} />
      <Route path="/cases" element={<UnivProject />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/invoices" element={<UnivInvoice />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/documents" element={<Navigate to="/smart-docs" replace />} />
      <Route path="/smart-docs" element={<HCMSmartDocs />} />
      <Route path="/team" element={<UnivHREmployee />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/portal" element={<PortalManagement />} />
      <Route path="/settings/custom-fields" element={<CustomFieldsSettings />} />
      <Route path="/roles" element={<Roles />} />
      <Route path="/departments" element={<Departments />} />
      <Route path="/integrations" element={<AppIntegrations />} />
      <Route path="/automations" element={<Automations />} />
      <Route path="/notifications" element={<NotificationsInbox />} />
      <Route path="/sites" element={<SlateSites />} />
      <Route path="/sites/builder" element={<SiteBuilderPage />} />
      <Route path="/client-portal" element={<ClientPortal />} />
      <Route path="/cases/:id" element={<CaseDetail />} />
      <Route path="/my-dashboard" element={<StaffDashboard />} />
      <Route path="/leads" element={<UnivCRM />} />
      <Route path="/billing" element={<BillingDashboard />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="/trust-accounting" element={<SmartTrustAccountingRouter />} />
      <Route path="/research" element={<LegalResearch />} />
      <Route path="/audit" element={<AuditLog />} />
      <Route path="/leave" element={<UnivLeaveManagement />} />
      <Route path="/performance" element={<PerformanceDashboard />} />
      <Route path="/outcomes" element={<CaseOutcomes />} />
      <Route path="/conflict-check" element={<ConflictChecker />} />
      <Route path="/email-inbox" element={<EmailInbox />} />
      <Route path="/reports" element={<ReportsDashboard />} />
      <Route path="/export" element={<DataExport />} />
      <Route path="/whatsapp" element={<WhatsAppMessenger />} />
      <Route path="/hr" element={<UnivHRSystem />} />
      <Route path="/ats" element={<ATS />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/benefits" element={<Benefits />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/intranet" element={<Intranet />} />
      <Route path="/hr-analytics" element={<HRAnalytics />} />
      <Route path="/recruitment" element={<UnivRecruitment />} />
      <Route path="/inventory" element={<UnivInventory />} />
      <Route path="/payroll" element={<UnivPayroll />} />
      <Route path="/attendance" element={<UnivAttendance />} />
      <Route path="/leave-mgmt" element={<UnivLeaveManagement />} />
      <Route path="/payments" element={<UnivPayment />} />
      <Route path="/assets" element={<UnivAssetManagement />} />
      <Route path="/procurement" element={<UnivProcurement />} />
      <Route path="/analytics" element={<UnivAnalytics />} />
      <Route path="/bom" element={<UnivBOM />} />
      <Route path="/boq" element={<UnivBOQ />} />
      <Route path="/bookings" element={<UnivBooking />} />
      <Route path="/univ-calendar" element={<UnivCalendar />} />
      <Route path="/case-mgmt" element={<UnivCaseManagement />} />
      <Route path="/class-attendance" element={<UnivClassAttendance />} />
      <Route path="/portal" element={<MasterPortalRouter />} />
      <Route path="/contractors" element={<UnivContractor />} />
      <Route path="/courses" element={<UnivCourse />} />
      <Route path="/court" element={<UnivCourtCalendar />} />
      <Route path="/univ-dashboard" element={<UnivDashboard />} />
      <Route path="/datagrid" element={<UnivDataGrid />} />
      <Route path="/delivery" element={<UnivDelivery />} />
      <Route path="/dining" element={<UnivDining />} />
      <Route path="/dispatch" element={<UnivDispatch />} />
      <Route path="/emr" element={<UnivEMR />} />
      <Route path="/faculty" element={<UnivFaculty />} />
      <Route path="/fleet" element={<UnivFleet />} />
      <Route path="/form" element={<UnivForm />} />
      <Route path="/gradebook" element={<UnivGradebook />} />
      <Route path="/univ-housekeeping" element={<UnivHousekeeping />} />
      <Route path="/lms" element={<UnivLMS />} />
      <Route path="/lab" element={<UnivLab />} />
      <Route path="/legal-docs" element={<UnivLegalDocument />} />
      <Route path="/univ-appointments" element={<UnivAppointments />} />
      <Route path="/univ-machines" element={<UnivMachine />} />
      <Route path="/univ-menus" element={<UnivMenu />} />
      <Route path="/univ-messaging" element={<UnivMessaging />} />
      <Route path="/univ-notifications" element={<UnivNotification />} />
      <Route path="/univ-parent-portal" element={<UnivParentPortal />} />
      <Route path="/univ-patients" element={<UnivPatient />} />
      <Route path="/univ-pos" element={<UnivPOS />} />
      <Route path="/univ-prescriptions" element={<UnivPrescription />} />
      <Route path="/univ-production" element={<UnivProduction />} />
      <Route path="/univ-quality-control" element={<UnivQualityControl />} />
      <Route path="/univ-rooms" element={<UnivRoom />} />
      <Route path="/univ-routes" element={<UnivRoute />} />
      <Route path="/univ-safety" element={<UnivSafety />} />
      <Route path="/univ-search" element={<UnivSearch />} />
      <Route path="/univ-site-inspections" element={<UnivSiteInspection />} />
      <Route path="/univ-students" element={<UnivStudent />} />
      <Route path="/univ-subscriptions" element={<UnivSubscription />} />
      <Route path="/univ-telemedicine" element={<UnivTelemedicine />} />
      <Route path="/univ-timelines" element={<UnivTimeline />} />
      <Route path="/univ-wards" element={<UnivWard />} />
      <Route path="/univ-warehouses" element={<UnivWarehouse />} />
      <Route path="/firm-setup" element={<OnboardingWizard />} />
      <Route path="/unified-inbox" element={<UnifiedInbox />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/board" element={<Board />} />
                          <Route path="/join/:roomId" element={<JoinMeeting />} />
      <Route path="/pages/:pageId" element={<CustomPageViewer />} />

      {/* Orbit Component Tester (Super Admin Only) */}
      <Route path="/orbit-test/:componentName" element={<OrbitComponentTester />} />

      {/* School Routes */}
      <Route path="/students" element={<SchoolStudents />} />
      <Route path="/students/:id" element={<StudentProfile />} />
      <Route path="/parents" element={<SchoolParents />} />
      <Route path="/teachers" element={<SchoolTeachers />} />
      <Route path="/complaints" element={<SchoolComplaints />} />
      <Route path="/support-center" element={<SchoolSupportCenter />} />

      <Route path="/institution-settings" element={<SchoolInstitutionSettings />} />
      <Route path="/o/learner/:id" element={<LearnerProfile />} />
      <Route path="/o/notes" element={<NotesCenter />} />
      <Route path="/o/assessments" element={<OnlineAssessments />} />
      <Route path="/o/certificates" element={<OnlineCertificates />} />
      <Route path="/o/live" element={<OnlineLive />} />

      <Route path="/canteen-pos" element={<SchoolCanteenPOS />} />
      <Route path="/classes" element={<SchoolClasses />} />
      <Route path="/timetable" element={<SchoolTimetable />} />
      <Route path="/assignments" element={<SchoolAssignments />} />
      <Route path="/attendance" element={<SchoolAttendance />} />
      <Route path="/grades" element={<SchoolGrades />} />
      <Route path="/exams" element={<SchoolExams />} />
      <Route path="/discipline" element={<SchoolDiscipline />} />
      <Route path="/fees" element={<SchoolFees />} />
      <Route path="/library" element={<SchoolLibrary />} />
      <Route path="/transport" element={<SchoolTransport />} />
      <Route path="/hostel" element={<SchoolHostel />} />
      <Route path="/notices" element={<SchoolNotices />} />
      <Route path="/student-portal" element={<SchoolStudentPortal />} />
      <Route path="/parent-portal" element={<SchoolParentPortal />} />

      <Route path="/gamification" element={<SchoolGamification />} />
      <Route path="/teacher-evaluations" element={<SchoolTeacherEvaluations />} />

      {/* University Suite Routes */}
      <Route path="/u/" element={<UniDashboard />} />
      <Route path="/u/students" element={<UniStudents />} />
      <Route path="/u/faculties" element={<UniFaculties />} />
      <Route path="/u/courses" element={<UniCourses />} />
      <Route path="/u/admissions" element={<UniAdmissions />} />
      <Route path="/u/finance" element={<UniFinance />} />
      <Route path="/u/enrollment" element={<UniEnrollment />} />
      <Route path="/u/revenue" element={<UniRevenue />} />
      <Route path="/u/research-activity" element={<UniResearchActivity />} />
      <Route path="/u/graduation-stats" element={<UniGraduationStats />} />
      <Route path="/u/academic-structure" element={<UniAcademicStructure />} />
      <Route path="/u/registration" element={<UniRegistration />} />
      <Route path="/u/lms" element={<UniLMS />} />
      <Route path="/u/exams" element={<UniExams />} />
      <Route path="/u/hostel" element={<UniHostel />} />
      <Route path="/u/library" element={<UniLibrary />} />
      <Route path="/u/career-alumni" element={<UniCareerAlumni />} />

      {/* Vocational Suite Routes */}
      <Route path="/v/" element={<VDashboard />} />
      <Route path="/v/trades" element={<VTrades />} />
      
      {/* CliPad Routes (also mounted here for legacy fallback/support) */}
      <Route element={<ClipadLayout />}>
        <Route path="/clipad/space/:spaceId" element={<SpaceDashboard />} />
        <Route path="/clipad/record" element={<RecordVideo />} />
        <Route path="/clipad/watch/:videoId" element={<WatchVideo />} />
        <Route path="/clipad/meeting/:id" element={<MeetingRecord />} />
        <Route path="/clipad/save-meeting/:id" element={<SaveMeetingPage />} />
        <Route path="/clipad/settings" element={<CliPadSettings />} />
        <Route path="/clipad/integrations" element={<IntegrationsHub />} />
        <Route path="/clipad/search" element={<SearchHub />} />
        <Route path="/clipad/analytics" element={<VideoAnalytics />} />
        <Route path="/clipad/enterprise" element={<CliPadEnterpriseDashboard />} />
        <Route path="/clipad/health" element={<KnowledgeHealth />} />
        <Route path="/clipad/integration-analytics" element={<IntegrationAnalytics />} />
        <Route path="/clipad/timeline" element={<KnowledgeTimeline />} />
        <Route path="/clipad/decisions" element={<DecisionLedger />} />
        <Route path="/clipad/decisions/:decisionId/replay" element={<DecisionReplay />} />
        <Route path="/clipad/graph" element={<KnowledgeGraph />} />
        <Route path="/clipad/knowledge-graph" element={<KnowledgeGraph />} />
        <Route path="/clipad/action-items" element={<ActionItems />} />
        <Route path="/clipad/knowledge" element={<KnowledgeJourney />} />
        <Route path="/clipad/journey" element={<KnowledgeJourney />} />
        <Route path="/clipad/commitments" element={<CommitmentIntelligence />} />
        <Route path="/clipad/risk" element={<PredictiveRisk />} />
        <Route path="/clipad/pulse" element={<OrgHealthPulse />} />
        <Route path="/clipad/cross-space" element={<CrossSpaceIntelligence />} />
      </Route>

      <Route path="/custom-pricing" element={<CliPadCustomPricing />} />
      <Route path="/clipad/custom-pricing" element={<CliPadCustomPricing />} />

      {/* Clipad Super Admin Routes */}
      <Route element={<ClipadAdminLayout />}>
        <Route path="/clipad/admin" element={<ClipadAdminOverview />} />
        <Route path="/clipad/admin/support" element={<ClipadLiveSupport />} />
        <Route path="/clipad/admin/companies" element={<CompanyManagement />} />
        <Route path="/clipad/admin/pricing" element={<PricingTags />} />
        <Route path="/clipad/admin/custom-requests" element={<CustomRequests />} />
        <Route path="/clipad/admin/audit" element={<AuditMonitor />} />
        <Route path="/clipad/admin/ai" element={<AdminAI />} />
      </Route>

      <Route path="/v/courses" element={<VCourses />} />
      <Route path="/v/workshops" element={<VWorkshops />} />
      <Route path="/v/practical-modules" element={<VPracticalModules />} />
      <Route path="/v/trainee-profiles" element={<VTraineeProfiles />} />
      <Route path="/v/training-progress" element={<VTrainingProgress />} />
      <Route path="/v/workshop-assessments" element={<VWorkshopAssessments />} />
      <Route path="/v/practical-exams" element={<VPracticalExams />} />
      <Route path="/v/skill-demonstrations" element={<VSkillDemonstrations />} />
      <Route path="/v/competency-tracking" element={<VCompetencyTracking />} />
      <Route path="/v/equipment-inventory" element={<VEquipmentInventory />} />
      <Route path="/v/equipment-reservations" element={<VEquipmentReservations />} />
      <Route path="/v/maintenance" element={<VMaintenance />} />
      <Route path="/v/internship-tracking" element={<VInternshipTracking />} />
      <Route path="/v/industrial-attachments" element={<VIndustrialAttachments />} />
      <Route path="/v/employer-evaluations" element={<VEmployerEvaluations />} />
      <Route path="/v/certificates" element={<VCertificates />} />
      <Route path="/v/skill-badges" element={<VSkillBadges />} />
      <Route path="/v/qualification-tracking" element={<VQualificationTracking />} />
      <Route path="/v/job-opportunities" element={<VJobOpportunities />} />
      <Route path="/v/employers" element={<VEmployers />} />
      <Route path="/v/placement-reports" element={<VPlacementReports />} />
      <Route path="/v/certification-rates" element={<VCertificationRates />} />
      <Route path="/v/employment-rates" element={<VEmploymentRates />} />
      <Route path="/v/course-performance" element={<VCoursePerformance />} />

      {/* Online Learning Suite Routes */}
      <Route path="/o/" element={<OnlineDashboard />} />
      <Route path="/o/learners" element={<OnlineLearners />} />
      <Route path="/o/courses" element={<OnlineCourses />} />
      <Route path="/o/sales" element={<OnlineSales />} />

      <Route path="/o/builder" element={<OnlineBuilder />} />
      <Route path="/o/builder/course/:courseId" element={<OnlineBuilder />} />
      <Route path="/o/builder/lesson/:courseId/:moduleId?" element={<LessonBuilder />} />
      <Route path="/o/builder/assessment/:courseId" element={<AssessmentBuilder />} />
      <Route path="/o/media" element={<MediaManager />} />
      <Route path="/o/learn/:courseId" element={<LearningPlayer />} />
      <Route path="/o/student-dashboard" element={<StudentDashboard />} />
      <Route path="/o/learner/:id" element={<LearnerProfile />} />
      <Route path="/o/notes" element={<NotesCenter />} />
      <Route path="/o/assessments" element={<OnlineAssessments />} />
      <Route path="/o/certificates" element={<OnlineCertificates />} />
      <Route path="/o/live" element={<OnlineLive />} />
      <Route path="/o/checkout/:courseId" element={<Checkout />} />
      <Route path="/o/subscriptions" element={<OnlineSubscriptions />} />
      <Route path="/o/affiliates" element={<OnlineAffiliates />} />
      <Route path="/o/corporate" element={<CorporateDashboard />} />
      <Route path="/o/community" element={<OnlineCommunity />} />
      <Route path="/o/ai" element={<OrbitAIAssistant />} />

      <Route path="/canteen-pos" element={<SchoolCanteenPOS />} />
      <Route path="/complaints" element={<SchoolComplaints />} />
      <Route path="/support-center" element={<SchoolSupportCenter />} />

      {/* Global Tower / Multi-Tenant Manager */}
      <Route path="/branch-manager" element={<TowerManager />} />

      <Route path="/campus-marketplace" element={<SchoolCampusMarketplace />} />
      <Route path="/institution-settings" element={<SchoolInstitutionSettings />} />

      {/* Hospital Suite */}
      <Route path="/patients" element={<HospitalPatients />} />
      <Route path="/appointments" element={<HospitalAppointments />} />
      <Route path="/wards" element={<HospitalWards />} />
      <Route path="/prescriptions" element={<HospitalPrescriptions />} />
      <Route path="/lab-results" element={<HospitalLabResults />} />
      <Route path="/pharmacy" element={<HospitalPharmacy />} />
      <Route path="/patient-portal" element={<HospitalPatientPortal />} />
      <Route path="/hospital-billing" element={<HospitalBilling />} />
      <Route path="/hospital-claims" element={<HospitalClaims />} />
      <Route path="/telemedicine" element={<HospitalTelemedicine />} />
      <Route path="/operation-theater" element={<HospitalOperationTheater />} />
      <Route path="/radiology" element={<HospitalRadiology />} />
      <Route path="/ambulance-dispatch" element={<HospitalAmbulanceDispatch />} />
      <Route path="/referrals" element={<HospitalReferrals />} />
      <Route path="/blood-bank" element={<HospitalBloodBank />} />
      <Route path="/queue" element={<HospitalQueue />} />
      <Route path="/staff-roster" element={<HospitalStaffRoster />} />
      <Route path="/infection-control" element={<HospitalInfectionControl />} />


      {/* Hotel Suite */}
      <Route path="/front-desk" element={<HotelFrontDesk />} />
      <Route path="/reservations" element={<HotelReservations />} />
      <Route path="/rooms" element={<HotelRooms />} />
      <Route path="/housekeeping" element={<HotelHousekeeping />} />
      <Route path="/restaurant" element={<HotelRestaurant />} />
      <Route path="/guest-requests" element={<HotelGuestRequests />} />
      <Route path="/guest-portal" element={<HotelGuestPortal />} />
      <Route path="/revenue" element={<HotelRevenueManagement />} />
      <Route path="/loyalty" element={<HotelLoyalty />} />
      <Route path="/guests" element={<HotelGuests />} />

      {/* Pharmacy Suite */}
      <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
      <Route path="/pharmacy/pos" element={<PharmacyPOS />} />
      <Route path="/pharmacy/prescriptions" element={<PharmacyPrescriptions />} />
      <Route path="/pharmacy/customers" element={<PharmacyCustomers />} />
      <Route path="/pharmacy/drugs" element={<PharmacyDrugs />} />
      <Route path="/pharmacy/inventory" element={<PharmacyInventory />} />
      <Route path="/pharmacy/claims" element={<PharmacyClaims />} />
      <Route path="/pharmacy/reports" element={<PharmacyReports />} />

      {/* Real Estate & JCL Suite */}
      <Route path="/real-estate" element={<SmartRealEstateDashboard />} />
      <Route path="/real-estate/dashboard" element={<SmartRealEstateDashboard />} />
      <Route path="/real-estate/land" element={<JCLLandManagement />} />
      <Route path="/real-estate/customer-timeline" element={<JCLCustomerTimeline />} />
      <Route path="/real-estate/properties" element={<SmartPropertiesRouter />} />
      <Route path="/real-estate/clients" element={<SmartClientsRouter />} />
      <Route path="/real-estate/leases" element={<SmartLeasesRouter />} />
      <Route path="/real-estate/viewings" element={<SmartViewingsRouter />} />
      <Route path="/real-estate/transactions" element={<SmartTransactionsRouter />} />
      <Route path="/real-estate/offers" element={<SmartOffersRouter />} />
      <Route path="/real-estate/commissions" element={<SmartCommissionsRouter />} />
      <Route path="/real-estate/rent-payments" element={<SmartRentPaymentsRouter />} />
      <Route path="/real-estate/maintenance" element={<SmartMaintenanceRouter />} />
      <Route path="/real-estate/crm-leads" element={<SmartLeadsRouter />} />
      <Route path="/real-estate/agent-metrics" element={<RealEstateAgentMetrics />} />
      <Route path="/real-estate/audit-log" element={<SmartAuditLogRouter />} />
      <Route path="/real-estate/commission-rules" element={<SmartCommissionRulesRouter />} />
      <Route path="/real-estate/comparable-properties" element={<RealEstateComparableProperties />} />
      <Route path="/real-estate/contractor-reviews" element={<SmartContractorReviewsRouter />} />
      <Route path="/real-estate/contractors" element={<SmartContractorsRouter />} />
      <Route path="/real-estate/counter-offers" element={<SmartCounterOffersRouter />} />
      <Route path="/real-estate/document-templates" element={<SmartDocumentTemplatesRouter />} />
      <Route path="/real-estate/e-signatures" element={<SmartESignaturesRouter />} />
      <Route path="/real-estate/escrow-accounts" element={<SmartEscrowAccountsRouter />} />
      <Route path="/real-estate/escrow" element={<SmartEscrowAccountsRouter />} />
      <Route path="/real-estate/lease-renewals" element={<SmartLeaseRenewalsRouter />} />
      <Route path="/real-estate/market-data" element={<RealEstateMarketData />} />
      <Route path="/real-estate/market-intelligence" element={<RealEstateMarketIntelligence />} />
      <Route path="/real-estate/payment-schedules" element={<SmartPaymentSchedulesRouter />} />
      <Route path="/real-estate/recommendations" element={<RealEstateRecommendations />} />
      <Route path="/real-estate/team-management" element={<RealEstateTeamManagement />} />
      <Route path="/real-estate/trust-accounting" element={<SmartTrustAccountingRouter />} />
      <Route path="/finance/accounting" element={<SmartFirmAccountingRouter />} />
      <Route path="/real-estate/analytics" element={<SmartAnalyticsRouter />} />
      <Route path="/real-estate/field-tracker" element={<JCLMarketerTrackerPage />} />
      <Route path="/real-estate/marketer-tracker" element={<JCLMarketerTrackerPage />} />

      {/* Religion Suite */}
      <Route path="/members" element={<Clients />} />
      <Route path="/groups" element={<ReligionGroups />} />
      <Route path="/events" element={<ReligionEvents />} />
      <Route path="/donations" element={<ReligionDonations />} />
      <Route path="/volunteers" element={<ReligionVolunteers />} />
      <Route path="/sermons" element={<ReligionSermons />} />
      <Route path="/small-groups" element={<ReligionSmallGroups />} />
      <Route path="/prayers" element={<ReligionPrayers />} />
      <Route path="/milestones" element={<ReligionMilestones />} />
      <Route path="/member-portal" element={<ReligionMemberPortal />} />

      {/* Insurance Suite */}
      <Route path="/policies" element={<InsurancePolicies />} />
      <Route path="/claims" element={<InsuranceClaims />} />
      <Route path="/insurance-clients" element={<Clients />} />
      <Route path="/policyholder-portal" element={<InsurancePolicyholderPortal />} />
      <Route path="/underwriting" element={<InsuranceUnderwriting />} />
      <Route path="/actuarial" element={<ActuarialDashboard />} />
      <Route path="/reinsurance" element={<Reinsurance />} />
      <Route path="/agent-performance" element={<InsuranceAgentPerformance />} />
      <Route path="/premiums" element={<InsurancePremiums />} />

      {/* Retail Suite */}
      <Route path="/retail" element={<RetailDashboard />} />
      <Route path="/retail-dashboard" element={<RetailDashboard />} />
      <Route path="/products" element={<Products />} />
      <Route path="/pos" element={<RetailPOS />} />
      <Route path="/shifts" element={<Shifts />} />
      <Route path="/barcodes" element={<BarcodeManagement />} />
      <Route path="/rmas" element={<RMAManagement />} />
      <Route path="/store-builder" element={<OnlineStoreBuilder />} />
      <Route path="/b2b-portal" element={<B2BWholesalePortal />} />
      <Route path="/franchise-manager" element={<FranchiseManager />} />
      <Route path="/purchase-orders" element={<RetailPurchaseOrders />} />
      <Route path="/promotions" element={<RetailPromotions />} />
      <Route path="/retail-inventory" element={<RetailInventory />} />
      <Route path="/sales" element={<RetailSales />} />
      <Route path="/suppliers" element={<RetailSuppliers />} />
      <Route path="/retail-customers" element={<Clients />} />
      <Route path="/customer-portal" element={<RetailCustomerPortal />} />

      {/* Logistics & Supply Chain */}
      <Route path="/smart-docs" element={<SmartDocs />} />
      <Route path="/load-board" element={<LoadBoard />} />
      <Route path="/dispatch-board" element={<DispatchBoard />} />
      <Route path="/warehouse" element={<Warehouse />} />
      <Route path="/ai-routes" element={<RouteOptimization />} />
      <Route path="/geofences" element={<GeofenceAlerts />} />
      <Route path="/shipments" element={<LogisticsShipments />} />
      <Route path="/fleet" element={<LogisticsFleet />} />
      <Route path="/drivers" element={<LogisticsDrivers />} />
      <Route path="/tracking" element={<LogisticsTrackingPortal />} />
      <Route path="/warehouse" element={<LogisticsWarehouse />} />
      <Route path="/routes" element={<LogisticsRouteOptimization />} />
      <Route path="/proof-of-delivery" element={<LogisticsProofOfDelivery />} />
      <Route path="/incidents" element={<LogisticsIncidentManagement />} />
      <Route path="/returns" element={<LogisticsReturnsManagement />} />
      <Route path="/logistics-analytics" element={<LogisticsAdvancedAnalytics />} />
      <Route path="/driver-mobile-app" element={<LogisticsDriverMobileApp />} />

      {/* HR Suite Dedicated Pages */}
      <Route path="/hr/employees" element={<HREmployees />} />
      <Route path="/hr/departments" element={<HRDepartments />} />
      <Route path="/hr/roles" element={<HRRoles />} />
      <Route path="/hr/leave" element={<HRLeave />} />
      <Route path="/hr/attendance" element={<HRAttendance />} />
      <Route path="/hr/payroll" element={<HRPayroll />} />
      <Route path="/hr/performance" element={<HRPerformance />} />
      <Route path="/hr/training" element={<HRTraining />} />
      <Route path="/hr/recruitment" element={<HRRecruitment />} />
      <Route path="/hr/complaints" element={<HRComplaints />} />
      <Route path="/hr/promotions" element={<HRPromotions />} />
      <Route path="/hr/salary" element={<HRSalary />} />
      
      {/* Legacy mappings */}
      <Route path="/employees" element={<HREmployees />} />
      <Route path="/recruitment" element={<HRRecruitment />} />
      <Route path="/payroll" element={<HRPayroll />} />
      <Route path="/hr-leave" element={<HRLeave />} />

      {/* Missing Industry Pages mapped to GenericModulePage */}
      <Route path="/products" element={<Products />} />
      <Route path="/org-chart" element={<GenericModulePage />} />
      <Route path="/disciplinary" element={<GenericModulePage />} />
      <Route path="/dispatch" element={<GenericModulePage />} />
      <Route path="/shifts" element={<Shifts />} />
      <Route path="/fleet" element={<GenericModulePage />} />
      <Route path="/pickups" element={<Pickups />} />
      <Route path="/training" element={<GenericModulePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/sso" element={<SSOGateway />} />
        <Route path="/auth/callback" element={<SSOCallback />} />
        <Route path="/auth/google-callback" element={<GoogleCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/loyalty" element={<Loyalty />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/time-tracking" element={<TimeTracking />} />
      {/* High School (SHS) Routes */}
      <Route path="/s/" element={<SHSDashboard />} />
      <Route path="/s/students" element={<SHSStudents />} />
      <Route path="/s/student-profiles" element={<SHSStudentProfiles />} />
      <Route path="/s/promotion" element={<SHSStudentPromotion />} />
      <Route path="/s/transfers" element={<SHSStudentTransfers />} />
      <Route path="/s/discipline" element={<SHSDisciplineRecords />} />
      <Route path="/s/medical" element={<SHSMedicalRecords />} />
      <Route path="/s/admissions" element={<SHSAdmissions />} />
      <Route path="/s/applicant-review" element={<SHSApplicantReview />} />
      <Route path="/s/admission-decisions" element={<SHSAdmissionDecisions />} />
      <Route path="/s/enrollment" element={<SHSEnrollment />} />
      <Route path="/s/classes" element={<SHSClasses />} />
      <Route path="/s/programmes" element={<SHSProgrammes />} />
      <Route path="/s/houses" element={<SHSHouses />} />
      <Route path="/s/streams" element={<SHSStreams />} />
      <Route path="/s/subjects" element={<SHSSubjects />} />
      <Route path="/s/electives" element={<SHSElectives />} />
      <Route path="/s/academic-calendar" element={<SHSAcademicCalendar />} />
      <Route path="/s/timetable" element={<SHSTimetable />} />
      <Route path="/s/daily-attendance" element={<SHSDailyAttendance />} />
      <Route path="/s/class-attendance" element={<SHSClassAttendance />} />
      <Route path="/s/teacher-attendance" element={<SHSTeacherAttendance />} />
      <Route path="/s/attendance-reports" element={<SHSAttendanceReports />} />
      <Route path="/s/internal-exams" element={<SHSInternalExams />} />
      <Route path="/s/mock-exams" element={<SHSMockExams />} />
      <Route path="/s/assessment" element={<SHSContinuousAssessment />} />
      <Route path="/s/grades" element={<SHSGrades />} />
      <Route path="/s/results" element={<SHSResultsProcessing />} />
      <Route path="/s/report-cards" element={<SHSReportCards />} />
      <Route path="/s/dormitories" element={<SHSDormitories />} />
      <Route path="/s/room-allocation" element={<SHSRoomAllocation />} />
      <Route path="/s/house-masters" element={<SHSHouseMasters />} />
      <Route path="/s/boarding-attendance" element={<SHSBoardingAttendance />} />
      <Route path="/s/parent-progress" element={<SHSParentProgress />} />
      <Route path="/s/parent-attendance" element={<SHSParentAttendance />} />
      <Route path="/s/parent-fees" element={<SHSParentFees />} />
      <Route path="/s/parent-comms" element={<SHSParentComms />} />
      <Route path="/s/fees" element={<SHSFees />} />
      <Route path="/s/invoices" element={<SHSInvoices />} />
      <Route path="/s/payments" element={<SHSPayments />} />
      <Route path="/s/scholarships" element={<SHSScholarships />} />
      <Route path="/s/financial-reports" element={<SHSFinancialReports />} />
      <Route path="/s/books" element={<SHSBooks />} />
      <Route path="/s/borrowing" element={<SHSBorrowing />} />
      <Route path="/s/returns" element={<SHSReturns />} />
      <Route path="/s/digital-resources" element={<SHSDigitalResources />} />
      <Route path="/s/buses" element={<SHSBuses />} />
      <Route path="/s/bus-routes" element={<SHSRoutes />} />
      <Route path="/s/bus-assignments" element={<SHSStudentAssignments />} />
      <Route path="/s/notices" element={<SHSNotices />} />
      <Route path="/s/sms" element={<SHSSMS />} />
      <Route path="/s/whatsapp" element={<SHSWhatsApp />} />
      <Route path="/s/email-comms" element={<SHSEmailComms />} />
      <Route path="/s/academic-analytics" element={<SHSAcademicAnalytics />} />
      <Route path="/s/attendance-analytics" element={<SHSAttendanceAnalytics />} />
      <Route path="/s/financial-analytics" element={<SHSFinancialAnalytics />} />


      
      {/* OrbitBolt & Builder */}
      <Route path="/slate/BOLT" element={<CreateModulePage isBoltOpen={true} />} />
      <Route path="/slate/create" element={<CreateModulePage />} />
      <Route path="/slate/edit/:id" element={<CreateModulePage />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/m/*" element={<GenericModulePage />} />
    </>
  );
}

const AppPageSkeleton = () => (
  <div className="flex flex-col bg-slate-50 dark:bg-background p-4 sm:p-6 md:p-8 animate-pulse w-full">
    <div className="flex justify-between items-start mb-8">
      <div>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48 mb-2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32"></div>
      </div>
      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-32"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#111111] border border-slate-100 dark:border-white/5 rounded-2xl h-32"></div>
      ))}
    </div>
    <div className="bg-white dark:bg-[#111111] border border-slate-100 dark:border-white/5 rounded-2xl h-64 mb-8"></div>
  </div>
);


function GlobalSystemListener() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const handleSuccess = (e) => {
      // Invalidate queries universally so disjointed data dashboards sync instantly
      queryClient.invalidateQueries(); 
      // Disabled global toast to prevent popup spam
    };
    const handleError = (e) => {
      toast({ title: "Action Failed", description: e.detail.error?.message || "An error occurred.", variant: "destructive" });
    };
    const handleHardError = (e) => {
      console.error("Cloud Sync Failed:", e.detail.errorMessage);
    };

    window.addEventListener('db:local-mutation-success', handleSuccess);
    window.addEventListener('db:local-mutation-error', handleError);
    window.addEventListener('sync:hard-error', handleHardError);
    return () => {
      window.removeEventListener('db:local-mutation-success', handleSuccess);
      window.removeEventListener('db:local-mutation-error', handleError);
      window.removeEventListener('sync:hard-error', handleHardError);
    };
  }, [queryClient, toast]);

  return null;
}

function ProtectedRoute() {
  const { isAuthenticated, isLoadingAuth, authChecked, user, authStep } = useAuth();
  
  // Show spinner while auth is loading OR while auth hasn't been checked yet
  if (isLoadingAuth || !authChecked) {
    return <PageLoader label="" />;
  }
  
  if (!isAuthenticated) {
    // Use React Router Navigate instead of window.location.href to avoid
    // an irreversible hard page reload that cannot be cancelled
    return <Navigate to={`/login?continue=${encodeURIComponent(window.location.pathname + window.location.search)}`} replace />;
  }
  
  if (user?.company_status === 'suspended') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50/50 dark:bg-background p-4 font-sans backdrop-blur-sm">
        <div className="max-w-md w-full bg-white dark:bg-secondary rounded-3xl p-8 text-center border-[0.5px] border-black/9 dark:border-white/8 border-slate-100 dark:border-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10/10 text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight tracking-[-0.02em]">Workspace Suspended</h1>
          <p className="text-slate-500 dark:text-muted-foreground mb-8 leading-relaxed font-medium">
            Your workspace access has been temporarily suspended by an administrator. Please contact support to resolve this issue.
          </p>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 px-6 rounded-xl transition-all">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const isAccountDomain = window.location.hostname.startsWith('account.') || window.location.hostname === 'account.localhost';
  
  if (!user?.company_id && user?.role !== 'super_admin' && !window.location.pathname.startsWith('/onboarding') && !isAccountDomain) {
    return <Navigate to="/onboarding" replace />;
  }

  // Intercept forced password reset
  if (user?.user_metadata?.force_password_reset && window.location.pathname !== '/force-reset-password') {
    return <Navigate to="/force-reset-password" replace />;
  }

  // â”€â”€ PORTAL USER REDIRECT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // If the logged-in user has a portal role (client/patient/student/tenant etc.)
  // they should ONLY see /portal. Bounce them there if they try to access any
  // other route in the main workspace.
  const PORTAL_ROLES = [
    'client', 'patient', 'student', 'parent', 'guardian', 'tenant',
    'landlord', 'owner', 'guest', 'member', 'policyholder', 'trainee',
    'learner', 'employee', 'portal_user',
  ];
  const isPortalUser = user?.role && PORTAL_ROLES.includes(user.role.toLowerCase());
  const isOnPortalRoute = window.location.pathname.startsWith('/portal');

  if (isPortalUser && !isOnPortalRoute) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}

function SuperAdminRoute() {
  const { user, isLoadingAuth } = useAuth();
  // Wait for auth to finish loading before deciding — prevents flash-redirect
  // when the user object hasn't been hydrated yet from Supabase.
  if (isLoadingAuth) return null;
  // Check both top-level role and user_metadata.role (set during sign-up)
  const role = user?.role || user?.user_metadata?.role;
  if (role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

function CapacitorKeyboardFixer() {
  const location = useLocation();
  
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Keyboard.hide().catch(() => {});
    }
  }, [location.pathname]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setTimeout(() => Keyboard.hide().catch(() => {}), 500);
      setTimeout(() => Keyboard.hide().catch(() => {}), 1500);
    }
  }, []);

  return null;
}

function App() {
  const { currentSubdomain } = getSubdomainAndBase();
  const isNativeApp = isDesktopApp();
  const isBaseDomain = currentSubdomain === null;
  const isMeetDomain = window.location.hostname.startsWith('clipad.');
  const isAccountDomain = window.location.hostname.startsWith('account.');

  useEffect(() => {
    initPowerSync().catch(console.error);
    if (isNativeApp) {
      CapacitorUpdater.notifyAppReady().catch(console.error);
    }
    
    // Intercept Supabase password recovery links that lost their path
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      if (window.location.pathname !== '/reset-password') {
        window.location.href = `/reset-password${window.location.hash}`;
      }
    }
  }, [isNativeApp]);

  return (
    <PowerSyncContext.Provider value={powerSync}>
    <HelmetProvider>
    <ImpersonationProvider>
      <AuthProvider>
        <ThemeProvider>
          <VideoProvider>
            <QueryClientProvider client={queryClientInstance}>
            <Router>
              <CapacitorKeyboardFixer />
              <SiteDomainResolver>
              <GlobalSystemListener />
              <ErrorBoundary>
                {isMeetDomain ? (
                  /* â”€â”€ MEET DOMAIN: completely isolated Suspense â€” NO Slate loader â”€â”€ */
                  <React.Suspense fallback={null}>
                    <Routes>
                      <Route path="/" element={<MeetLandingPage />} />
                      <Route path="/custom-pricing" element={<CliPadCustomPricing />} />
                      <Route path="/pricing/custom" element={<CliPadCustomPricing />} />
                      <Route path="/login" element={<CliPadLogin />} />
                      <Route path="/signup" element={<CliPadSignUp />} />
                      <Route path="/auth/callback" element={<SSOCallback />} />
                      <Route path="/auth/google-callback" element={<GoogleCallback />} />
                      <Route element={<ClipadLayout />}>
                        <Route path="/join/:roomId" element={<StandaloneMeeting />} />
                        <Route path="/watch/:videoId" element={<WatchVideo />} />
                      </Route>
                        <Route element={<ClipadLayout />}>
                          <Route path="/dashboard" element={<CliPadDashboard />} />
                          <Route path="/analytics" element={<AnalyticsPageRouter />} />
                          <Route path="/enterprise" element={<CliPadEnterpriseDashboard />} />
                          <Route path="/spaces" element={<SpacesList />} />
                          <Route path="/spaces/:spaceId" element={<SpaceDashboard />} />
                          <Route path="/health" element={<KnowledgeHealth />} />
                          <Route path="/timeline" element={<KnowledgeTimeline />} />
                          <Route path="/decisions" element={<DecisionLedger />} />
                          <Route path="/decisions/:decisionId/replay" element={<DecisionReplay />} />
                          <Route path="/graph" element={<KnowledgeGraph />} />
                          <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
                          <Route path="/action-items" element={<ActionItems />} />
                          <Route path="/knowledge" element={<KnowledgeJourney />} />
                          <Route path="/journey" element={<KnowledgeJourney />} />
                          <Route path="/integration-analytics" element={<IntegrationAnalytics />} />
                          <Route path="/record" element={<RecordVideo />} />
                          <Route path="/record/:id" element={<RecordVideo />} />
                          <Route path="/meetings" element={<MeetingsList />} />
                          <Route path="/videos" element={<VideosList />} />
                          <Route path="/meetings/:meetingId" element={<MeetingRecord />} />
                          <Route path="/save-meeting/:id" element={<SaveMeetingPage />} />
                          <Route path="/settings" element={<CliPadSettings />} />
                          <Route path="/integrations" element={<IntegrationsHub />} />
                          <Route path="/search" element={<SearchHub />} />
                          <Route path="/support" element={<CliPadSupport />} />
                          <Route path="/chat" element={<ClipadChat />} />
                          <Route path="/chat/:roomId" element={<ClipadChat />} />
                          <Route path="/admin/custom-requests" element={<CustomRequests />} />
                          <Route path="/clipad/admin/custom-requests" element={<CustomRequests />} />
                          <Route element={<SuperAdminRoute />}>
                            <Route path="/commitments" element={<CommitmentIntelligence />} />
                            <Route path="/risk" element={<PredictiveRisk />} />
                            <Route path="/pulse" element={<OrgHealthPulse />} />
                            <Route path="/cross-space" element={<CrossSpaceIntelligence />} />
                            <Route path="/admin" element={<SuperAdminDashboard />} />
                            <Route path="/admin/firms" element={<AdminFirms />} />
                            <Route path="/admin/users" element={<AdminUsers />} />
                            <Route path="/admin/pricing" element={<SuperAdminBilling title="Pricing Engine" />} />
                          </Route>
                        </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </React.Suspense>
                ) : isAccountDomain ? (
                  /* ── ACCOUNT DOMAIN: Global Identity Portal ── */
                  <React.Suspense fallback={<AppPageSkeleton />}>
                    <Routes>
                      <Route path="/login" element={<AccountLogin />} />
                      <Route path="/signup" element={<AccountSignUp />} />
                      <Route path="/sso" element={<SSOGateway />} />
                      <Route path="/auth/callback" element={<SSOCallback />} />
                      <Route path="/auth/google-callback" element={<GoogleCallback />} />
                      <Route element={<ProtectedRoute />}>
                        <Route element={<AccountPortalLayout />}>
                           <Route path="/" element={<AccountPortal />} />
                           <Route path="/security" element={<AccountSecurity />} />
                           <Route path="/personal-info" element={<AccountPersonalInfo />} />
                           <Route path="/subscriptions" element={<AccountPayments />} />
                           <Route path="/devices" element={<AccountDevices />} />
                           <Route path="/help" element={<AccountHelp />} />
                           <Route path="/docs" element={<AccountDocs />} />
                           <Route path="/tutorials" element={<AccountTutorials />} />
                           <Route path="/admin" element={<SuperAdminDashboard />} />
                           <Route path="/admin/firms" element={<AdminFirms />} />
                           <Route path="/admin/users" element={<AdminUsers />} />
                           {/* Catch all for inner layout routes that don't exist */}
                           <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                      </Route>
                    </Routes>
                  </React.Suspense>
                ) : (
                  /* ── ALL OTHER DOMAINS: workspace / marketing / app routes ── */
                  <React.Suspense fallback={<AppPageSkeleton />}>
                    {isBaseDomain ? (
                      /* Storefront Routes for the Base Domain */
                      <Routes>
                        <Route element={<MarketingLayout><Outlet /></MarketingLayout>}>
                          <Route path="/" element={<Home />} />
                          <Route path="/features" element={<Features />} />
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/enterprise-contact" element={<EnterpriseContact />} />
                          <Route path="/integrations" element={<Integrations />} />
                          <Route path="/changelog" element={<Changelog />} />
                          <Route path="/customers" element={<Customers />} />
                          <Route path="/security" element={<Security />} />
                          <Route path="/solutions" element={<Solutions />} />
                          <Route path="/roi-calculator" element={<RoiCalculator />} />
                          <Route path="/partners" element={<Partners />} />
                          <Route path="/legal" element={<LegalDocs />} />
                        </Route>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/sso" element={<SSOGateway />} />
                        <Route path="/auth/callback" element={<SSOCallback />} />
                        <Route path="/auth/google-callback" element={<GoogleCallback />} />
                        <Route path="/welcome" element={<NativeOnboarding />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route element={<ProtectedRoute />}>
                          <Route path="/force-reset-password" element={<ForceResetPassword />} />
                          <Route path="/onboarding" element={<OnboardingWizard />} />
                          {/* Super Admin Base Domain Dashboard */}
                          <Route element={<AppLayout />}>
                            <Route element={<SuperAdminRoute />}>
                              <Route path="/admin" element={<AdminOverview />} />
                              <Route path="/admin/intelligence" element={<AdminIntelligence />} />
                              <Route path="/admin/rollout" element={<AdminRollout />} />
                              <Route path="/admin/quotas" element={<AdminQuotas />} />
                              <Route path="/admin/firms" element={<AdminFirms />} />
                              <Route path="/admin/users" element={<AdminUsers />} />
                              <Route path="/admin/billing" element={<AdminBilling />} />

                              <Route path="/admin/pricing" element={<SuperAdminBilling title="Pricing Engine" />} />
                              <Route path="/admin/security" element={<AdminSecurity />} />
                              <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
                              <Route path="/admin/enterprise-requests" element={<AdminEnterpriseRequests />} />
                              <Route path="/admin/partners" element={<AdminPartners />} />
                              <Route path="/admin/feature-insider" element={<AdminFeatureInsider />} />
                            </Route>
                            {PlatformRoutes()}
                          </Route>
                        </Route>
                        <Route path="/intake" element={<IntakeForm />} />
                        <Route path="*" element={<PageNotFound />} />
                      </Routes>
                    ) : (
                      /* App Routes for Subdomains */
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/sso" element={<SSOGateway />} />
                        <Route path="/auth/callback" element={<SSOCallback />} />
                        <Route path="/auth/google-callback" element={<GoogleCallback />} />
                        <Route path="/welcome" element={<NativeOnboarding />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route element={<ProtectedRoute />}>
                          <Route path="/force-reset-password" element={<ForceResetPassword />} />
                          <Route path="/onboarding" element={<OnboardingWizard />} />
                          <Route element={<AppLayout />}>
                            <Route element={<SuperAdminRoute />}>
                              <Route path="/admin" element={<AdminOverview />} />
                              <Route path="/admin/intelligence" element={<AdminIntelligence />} />
                              <Route path="/admin/rollout" element={<AdminRollout />} />
                              <Route path="/admin/quotas" element={<AdminQuotas />} />
                              <Route path="/admin/firms" element={<AdminFirms />} />
                              <Route path="/admin/users" element={<AdminUsers />} />
                              <Route path="/admin/billing" element={<AdminBilling />} />

                              <Route path="/admin/pricing" element={<SuperAdminBilling title="Pricing Engine" />} />
                              <Route path="/admin/security" element={<AdminSecurity />} />
                              <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
                              <Route path="/admin/enterprise-requests" element={<AdminEnterpriseRequests />} />
                              <Route path="/admin/partners" element={<AdminPartners />} />
                              <Route path="/admin/feature-insider" element={<AdminFeatureInsider />} />
                            </Route>
                            <Route path="/enterprise-admin" element={<EnterpriseDashboard />} />
                            <Route path="/feature-insider" element={<FeatureLab />} />
                            <Route path="/feature-vault" element={<FeatureVault />} />
                            {PlatformRoutes()}
                          </Route>
                          <Route path="/intake" element={<IntakeForm />} />
                          <Route path="*" element={<PageNotFound />} />
                        </Route>
                      </Routes>
                    )}
                  </React.Suspense>
                )}
              </ErrorBoundary>
              </SiteDomainResolver>
              <Toaster />
              <SonnerToaster />
              <HotToaster position="top-right" />
            </Router>
          </QueryClientProvider>
          </VideoProvider>
        </ThemeProvider>
      </AuthProvider>
    </ImpersonationProvider>
    </HelmetProvider>
    </PowerSyncContext.Provider>
  );
}

export default App;

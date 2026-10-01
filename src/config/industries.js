// Central industry configuration — single source of truth for the entire platform

export const INDUSTRIES = {
  law: {
    name: 'Law Firm',
    departments: [{value:'litigation', label:'Litigation'}, {value:'corporate', label:'Corporate'}, {value:'admin', label:'Administration'}],
    icon: '⚖️',
    terms: {
      client: 'Client', clients: 'Clients',
      case: 'Case', cases: 'Cases',
      staff: 'Lawyer', staffPlural: 'Lawyers',
      venue: 'Court', intake: 'Intake Form',
      hearing: 'Hearing', hearings: 'Hearings'},
    roles: [
      { value: 'company_admin', label: 'Managing Partner' },
      { value: 'lawyer', label: 'Lawyer / Associate' },
      { value: 'paralegal', label: 'Paralegal' },
      { value: 'legal_secretary', label: 'Legal Secretary' },
      { value: 'finance', label: 'Finance Officer' },
      { value: 'hr', label: 'HR Manager' },
      { value: 'client', label: 'Client (Portal)' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Cases', path: '/cases', icon: 'Briefcase' },
      { label: 'Clients', path: '/clients', icon: 'Users' },
      { label: 'Leads', path: '/leads', icon: 'UserPlus' },
      { label: 'Calendar', path: '/calendar', icon: 'Calendar' },
      { label: 'Billing', path: '/billing', icon: 'Receipt' },
      { label: 'Trust Accounting', path: '/trust-accounting', icon: 'Landmark' },
      { label: 'Pipeline', path: '/pipeline', icon: 'GitBranch' },
      { label: 'Legal Research', path: '/research', icon: 'BookOpen' },
      { label: 'Conflict Check', path: '/conflict-check', icon: 'Shield' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
      { label: 'Case Outcomes', path: '/outcomes', icon: 'Trophy' },
      { label: 'Email Inbox', path: '/email-inbox', icon: 'Mail' },
      { label: 'WhatsApp', path: '/whatsapp', icon: 'MessageCircle' },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Audit Log', path: '/audit', icon: 'Search' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  school: {
    name: 'School',
    icon: '🏫',
    terms: {
      client: 'Student', clients: 'Students',
      case: 'Class', cases: 'Classes',
      staff: 'Teacher', staffPlural: 'Teachers',
      venue: 'Campus', intake: 'Enrollment Form',
      hearing: 'Class Session', hearings: 'Class Sessions'},
    roles: [
      { value: 'company_admin', label: 'School Principal' },
      { value: 'teacher', label: 'Teacher' },
      { value: 'accountant', label: 'Accountant' },
      { value: 'librarian', label: 'Librarian' },
      { value: 'hr', label: 'HR Officer' },
      { value: 'parent', label: 'Parent / Guardian' },
      { value: 'student', label: 'Student' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Students', path: '/students', icon: 'Users' },
      { label: 'Parents & Guardians', path: '/parents', icon: 'HeartHandshake' },
      { label: 'Teachers & Staff', path: '/teachers', icon: 'Briefcase' },
      { label: 'Classes & Subjects', path: '/classes', icon: 'BookOpen' },
      { label: 'Timetable', path: '/timetable', icon: 'Calendar' },
      { label: 'Assignments', path: '/assignments', icon: 'FileText' },
      { label: 'Attendance', path: '/attendance', icon: 'CheckSquare' },
      { label: 'Grades', path: '/grades', icon: 'Award' },
      { label: 'Exams', path: '/exams', icon: 'FileText' },
      { label: 'Discipline', path: '/discipline', icon: 'Scale' },
      { label: 'Fee Management', path: '/fees', icon: 'Banknote' },
      { label: 'Library', path: '/library', icon: 'Library' },
      { label: 'Transport', path: '/transport', icon: 'Bus' },
      { label: 'Hostel', path: '/hostel', icon: 'BedDouble' },
      { label: 'Canteen POS', path: '/canteen-pos', icon: 'UtensilsCrossed' },
      { label: 'Noticeboard', path: '/notices', icon: 'Bell' },
      { label: 'Complaints', path: '/complaints', icon: 'AlertTriangle' },
      { label: 'Student Portal', path: '/student-portal', icon: 'GraduationCap' },
      { label: 'Parent Portal', path: '/parent-portal', icon: 'HeartHandshake' },
      { label: 'Gamification', path: '/gamification', icon: 'Trophy' },
      { label: 'Campus Marketplace', path: '/marketplace', icon: 'Store' },
      { label: 'Teacher Evaluations', path: '/teacher-evaluations', icon: 'ClipboardCheck' },
      { label: 'Support Center', path: '/support-center', icon: 'LifeBuoy' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare2' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },
      { label: 'Institution Settings', path: '/institution-settings', icon: 'Building' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  highschool: {
    name: 'High School',
    icon: '🏫',
    terms: {
      client: 'Student', clients: 'Students',
      case: 'Class', cases: 'Classes',
      staff: 'Teacher', staffPlural: 'Teachers',
      venue: 'Campus', intake: 'Enrollment',
      hearing: 'Session', hearings: 'Sessions'},
    roles: [
      { value: 'company_admin', label: 'Principal' },
      { value: 'teacher', label: 'Teacher' },
      { value: 'accountant', label: 'Accountant' },
      { value: 'hr', label: 'HR Officer' },
      { value: 'student', label: 'Student' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],
    nav: [

      { label: 'Dashboard', path: '/s/', icon: 'LayoutDashboard' },
      
      { section: 'Administration', label: 'Directory', path: '/s/students', icon: 'Users' },
      { label: 'Profiles', path: '/s/student-profiles', icon: 'UserCircle' },
      { label: 'Promotions', path: '/s/promotion', icon: 'TrendingUp' },
      { label: 'Transfers', path: '/s/transfers', icon: 'ArrowRightLeft' },
      { label: 'Discipline', path: '/s/discipline', icon: 'ShieldAlert' },
      { label: 'Medical', path: '/s/medical', icon: 'HeartPulse' },
      
      { section: 'Admissions', label: 'Applications', path: '/s/admissions', icon: 'FilePlus' },
      { label: 'Review', path: '/s/applicant-review', icon: 'FileCheck' },
      { label: 'Decisions', path: '/s/admission-decisions', icon: 'Gavel' },
      { label: 'Enrollment', path: '/s/enrollment', icon: 'UserPlus' },
      
      { section: 'Academics', label: 'Classes', path: '/s/classes', icon: 'BookOpen' },
      { label: 'Programmes', path: '/s/programmes', icon: 'Layers' },
      { label: 'Houses', path: '/s/houses', icon: 'Shield' },
      { label: 'Streams', path: '/s/streams', icon: 'GitBranch' },
      { label: 'Subjects', path: '/s/subjects', icon: 'BookOpen' },
      { label: 'Electives', path: '/s/electives', icon: 'Library' },
      { label: 'Calendar', path: '/s/academic-calendar', icon: 'CalendarDays' },
      { label: 'Timetable', path: '/s/timetable', icon: 'Calendar' },
      
      { section: 'Attendance', label: 'Daily', path: '/s/daily-attendance', icon: 'CalendarCheck' },
      { label: 'Classes', path: '/s/class-attendance', icon: 'Users' },
      { label: 'Teachers', path: '/s/teacher-attendance', icon: 'UserCheck' },
      { label: 'Reports', path: '/s/attendance-reports', icon: 'BarChart2' },
      
      { section: 'Examinations', label: 'Internal', path: '/s/internal-exams', icon: 'PenTool' },
      { label: 'Mock Exams', path: '/s/mock-exams', icon: 'Target' },
      { label: 'Assessment', path: '/s/assessment', icon: 'ClipboardList' },
      { label: 'Grades', path: '/s/grades', icon: 'Award' },
      { label: 'Results', path: '/s/results', icon: 'Calculator' },
      { label: 'Report Cards', path: '/s/report-cards', icon: 'FileText' },
      
      { section: 'Boarding', label: 'Dormitories', path: '/s/dormitories', icon: 'Home' },
      { label: 'Allocation', path: '/s/room-allocation', icon: 'BedDouble' },
      { label: 'Masters', path: '/s/house-masters', icon: 'UserCog' },
      { label: 'Attendance', path: '/s/boarding-attendance', icon: 'Moon' },
      
      { section: 'Finance', label: 'Fees', path: '/s/fees', icon: 'Banknote' },
      { label: 'Invoices', path: '/s/invoices', icon: 'Receipt' },
      { label: 'Payments', path: '/s/payments', icon: 'Banknote' },
      { label: 'Scholarships', path: '/s/scholarships', icon: 'Award' },
      { label: 'Reports', path: '/s/financial-reports', icon: 'PieChart' },
      
      { section: 'Library', label: 'Books', path: '/s/books', icon: 'BookMarked' },
      { label: 'Borrowing', path: '/s/borrowing', icon: 'ArrowUpRight' },
      { label: 'Returns', path: '/s/returns', icon: 'ArrowDownLeft' },
      { label: 'Digital', path: '/s/digital-resources', icon: 'Laptop' },
      
      { section: 'Transport', label: 'Buses', path: '/s/buses', icon: 'Bus' },
      { label: 'Routes', path: '/s/bus-routes', icon: 'Map' },
      { label: 'Assignments', path: '/s/bus-assignments', icon: 'MapPin' },
      
      { section: 'Comms', label: 'Notices', path: '/s/notices', icon: 'Bell' },
      { label: 'SMS', path: '/s/sms', icon: 'Smartphone' },
      { label: 'WhatsApp', path: '/s/whatsapp', icon: 'MessageSquare' },
      { label: 'Email', path: '/s/email-comms', icon: 'Mail' },
      
      { section: 'Portal', label: 'Progress', path: '/s/parent-progress', icon: 'LineChart' },
      { label: 'Attendance', path: '/s/parent-attendance', icon: 'CalendarSearch' },
      { label: 'Fees', path: '/s/parent-fees', icon: 'Wallet' },
      { label: 'Messages', path: '/s/parent-comms', icon: 'MessageCircle' },
      
      { section: 'Analytics', label: 'Academic', path: '/s/academic-analytics', icon: 'LineChart' },
      { label: 'Attendance', path: '/s/attendance-analytics', icon: 'Activity' },
      { label: 'Financial', path: '/s/financial-analytics', icon: 'TrendingUp' },
      


      { section: 'System', label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  university: {
    name: 'University',
    icon: '🎓',
    terms: {
      client: 'Student', clients: 'Students',
      case: 'Course', cases: 'Courses',
      staff: 'Lecturer', staffPlural: 'Lecturers',
      venue: 'Campus', intake: 'Admission Form',
      hearing: 'Session', hearings: 'Sessions'},
    roles: [
      { value: 'company_admin', label: 'Chancellor / Dean' },
      { value: 'lecturer', label: 'Lecturer' },
      { value: 'student', label: 'Student' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/u/', icon: 'LayoutDashboard' },
      
      { section: 'Executive Pages', label: 'Enrollment', path: '/u/enrollment', icon: 'Users' },
      { label: 'Revenue', path: '/u/revenue', icon: 'TrendingUp' },
      { label: 'Faculties', path: '/u/faculties', icon: 'Building' },
      { label: 'Research Activity', path: '/u/research-activity', icon: 'FlaskConical' },
      { label: 'Graduation Stats', path: '/u/graduation-stats', icon: 'GraduationCap' },

      { section: 'Academic Structure', label: 'Structure', path: '/u/academic-structure', icon: 'Network' },
      { label: 'Course Catalog', path: '/u/courses', icon: 'BookOpen' },
      { label: 'Registration Portal', path: '/u/registration', icon: 'ClipboardCheck' },

      { section: 'Student Info', label: 'Students Directory', path: '/u/students', icon: 'UserSquare2' },
      
      { section: 'Admissions', label: 'Portal', path: '/u/admissions', icon: 'PlusSquare' },

      { section: 'Learning & Exams', label: 'LMS WorkSlates', path: '/u/lms', icon: 'FolderOpen' },
      { label: 'Exams & Grading', path: '/u/exams', icon: 'Award' },

      { section: 'Campus Life', label: 'Hostels', path: '/u/hostel', icon: 'BedDouble' },
      { label: 'Library Catalog', path: '/u/library', icon: 'Library' },
      { label: 'Career & Alumni', path: '/u/career-alumni', icon: 'Briefcase' },
      { label: 'Finance Operations', path: '/u/finance', icon: 'Banknote' },



      { section: 'System', label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  online: {
    name: 'Online Learning',
    icon: '💻',
    terms: {
      client: 'Learner', clients: 'Learners',
      case: 'Course', cases: 'Courses',
      staff: 'Instructor', staffPlural: 'Instructors',
      venue: 'Platform', intake: 'Registration',
      hearing: 'Live Session', hearings: 'Live Sessions'},
    roles: [
      { value: 'company_admin', label: 'Platform Admin' },
      { value: 'instructor', label: 'Instructor' },
      { value: 'learner', label: 'Learner' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/o/', icon: 'LayoutDashboard' },
      { label: 'Learners', path: '/o/learners', icon: 'Users' },
      { label: 'Courses', path: '/o/courses', icon: 'BookOpen' },
      { label: 'Sales', path: '/o/sales', icon: 'Banknote' },

      { section: 'Course Creation', label: 'Builder', path: '/o/builder', icon: 'Hammer' },
      { label: 'Media Manager', path: '/o/media', icon: 'Image' },

      { section: 'Student Experience', label: 'Student Dashboard', path: '/o/student-dashboard', icon: 'PlayCircle' },
      { label: 'Notes', path: '/o/notes', icon: 'StickyNote' },
      { label: 'Assessments', path: '/o/assessments', icon: 'ClipboardCheck' },
      { label: 'Certificates', path: '/o/certificates', icon: 'Award' },
      { label: 'Live Sessions', path: '/o/live', icon: 'Video' },
      
      { section: 'E-commerce', label: 'Subscriptions', path: '/o/subscriptions', icon: 'RefreshCw' },
      { label: 'Affiliates', path: '/o/affiliates', icon: 'Users2' },
      { label: 'Corporate', path: '/o/corporate', icon: 'Building2' },
      
      { section: 'Community & AI', label: 'Community', path: '/o/community', icon: 'MessageSquare' },
      


      { section: 'System', label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  vocational: {
    name: 'Vocational / Technical',
    icon: '🔧',
    terms: {
      client: 'Trainee', clients: 'Trainees',
      case: 'Program', cases: 'Programs',
      staff: 'Instructor', staffPlural: 'Instructors',
      venue: 'Workshop', intake: 'Enrollment',
      hearing: 'Practical', hearings: 'Practicals'},
    roles: [
      { value: 'company_admin', label: 'Director' },
      { value: 'instructor', label: 'Instructor' },
      { value: 'apprentice', label: 'Trainee' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/v/', icon: 'LayoutDashboard' },
      
      { section: 'Programs', label: 'Trades', path: '/v/trades', icon: 'BookOpen' },
      { label: 'Courses', path: '/v/courses', icon: 'FileText' },
      { label: 'Workshops', path: '/v/workshops', icon: 'Building2' },
      { label: 'Practical Modules', path: '/v/practical-modules', icon: 'Layers' },
      
      { section: 'Trainee Management', label: 'Profiles', path: '/v/trainee-profiles', icon: 'Users' },
      { label: 'Progress', path: '/v/training-progress', icon: 'TrendingUp' },
      
      { section: 'Assessments', label: 'Workshop Ass.', path: '/v/workshop-assessments', icon: 'CheckSquare' },
      { label: 'Practical Exams', path: '/v/practical-exams', icon: 'PenTool' },
      { label: 'Skill Demos', path: '/v/skill-demonstrations', icon: 'Sparkles' },
      { label: 'Competency', path: '/v/competency-tracking', icon: 'Target' },
      
      { section: 'Equipment', label: 'Inventory', path: '/v/equipment-inventory', icon: 'Package' },
      { label: 'Reservations', path: '/v/equipment-reservations', icon: 'Calendar' },
      { label: 'Maintenance', path: '/v/maintenance', icon: 'Wrench' },
      
      { section: 'Attachments', label: 'Internships', path: '/v/internship-tracking', icon: 'Briefcase' },
      { label: 'Ind. Attachments', path: '/v/industrial-attachments', icon: 'Building2' },
      { label: 'Evaluations', path: '/v/employer-evaluations', icon: 'Star' },
      
      { section: 'Certification', label: 'Certificates', path: '/v/certificates', icon: 'Award' },
      { label: 'Skill Badges', path: '/v/skill-badges', icon: 'ShieldCheck' },
      { label: 'Qualifications', path: '/v/qualification-tracking', icon: 'GraduationCap' },
      
      { section: 'Placements', label: 'Job Opportunities', path: '/v/job-opportunities', icon: 'Search' },
      { label: 'Employers', path: '/v/employers', icon: 'Users2' },
      { label: 'Placement Reports', path: '/v/placement-reports', icon: 'FileText' },
      
      { section: 'Analytics', label: 'Certification Rates', path: '/v/certification-rates', icon: 'PieChart' },
      { label: 'Employment Rates', path: '/v/employment-rates', icon: 'TrendingUp' },
      { label: 'Course Performance', path: '/v/course-performance', icon: 'BarChart2' },
      


      { section: 'System', label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  hospital: {
    name: 'Hospital',
    icon: '🏥',
    terms: {
      client: 'Patient', clients: 'Patients',
      case: 'Admission', cases: 'Admissions',
      staff: 'Doctor', staffPlural: 'Doctors',
      venue: 'Ward', intake: 'Patient Registration',
      hearing: 'Appointment', hearings: 'Appointments'},
    roles: [
      { value: 'company_admin', label: 'Hospital Director' },
      { value: 'doctor', label: 'Doctor' },
      { value: 'nurse', label: 'Nurse' },
      { value: 'receptionist', label: 'Receptionist' },
      { value: 'pharmacist', label: 'Pharmacist' },
      { value: 'lab_technician', label: 'Lab Technician' },
      { value: 'finance', label: 'Finance Officer' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Patients', path: '/patients', icon: 'Users' },
      { label: 'Appointments', path: '/appointments', icon: 'Calendar' },
      { label: 'Ward Management', path: '/wards', icon: 'Building2' },
      { label: 'Prescriptions', path: '/prescriptions', icon: 'Pill' },
      { label: 'Lab Results', path: '/lab-results', icon: 'FlaskConical' },
      { label: 'Pharmacy', path: '/pharmacy', icon: 'ShoppingBag' },
      { label: 'Insurance Claims', path: '/hospital-claims', icon: 'Shield' },
      { label: 'Billing', path: '/hospital-billing', icon: 'Receipt' },
      { label: 'Telemedicine', path: '/telemedicine', icon: 'Video' },
      { label: 'Operation Theater', path: '/operation-theater', icon: 'Activity' },
      { label: 'Radiology', path: '/radiology', icon: 'Image' },
      { label: 'Ambulance Dispatch', path: '/ambulance-dispatch', icon: 'Truck' },
      { label: 'Staff', path: '/team', icon: 'UserCog' },
      { label: 'Referrals', path: '/referrals', icon: 'Network' },
      { label: 'Blood Bank', path: '/blood-bank', icon: 'Droplet' },
      { label: 'OPD Queue', path: '/queue', icon: 'Users2' },
      { label: 'Staff Roster', path: '/staff-roster', icon: 'CalendarDays' },
      { label: 'Infection Control', path: '/infection-control', icon: 'ShieldAlert' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  hotel: {
    name: 'Hotel',
    icon: '🏨',
    terms: {
      client: 'Guest', clients: 'Guests',
      case: 'Booking', cases: 'Bookings',
      staff: 'Staff', staffPlural: 'Staff',
      venue: 'Property', intake: 'Reservation',
      hearing: 'Reservation', hearings: 'Reservations'},
    roles: [
      { value: 'company_admin', label: 'Hotel Manager' },
      { value: 'receptionist', label: 'Receptionist' },
      { value: 'housekeeper', label: 'Housekeeper' },
      { value: 'chef', label: 'Chef' },
      { value: 'waiter', label: 'Waiter / Server' },
      { value: 'finance', label: 'Finance Officer' },
      { value: 'maintenance', label: 'Maintenance Staff' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Front Desk', path: '/front-desk', icon: 'Building2' },
      { label: 'Reservations', path: '/reservations', icon: 'Calendar' },
      { label: 'Guests & History', path: '/guests', icon: 'Users' },
      { label: 'Room Management', path: '/rooms', icon: 'BedDouble' },
      { label: 'Housekeeping', path: '/housekeeping', icon: 'Sparkles' },
      { label: 'Revenue Management', path: '/revenue', icon: 'TrendingUp' },
      { label: 'Guest Loyalty', path: '/loyalty', icon: 'Award' },
      { label: 'Restaurant / POS', path: '/restaurant', icon: 'UtensilsCrossed' },
      { label: 'Guest Requests', path: '/guest-requests', icon: 'BellRing' },
      { label: 'Billing', path: '/billing', icon: 'Receipt' },
      { label: 'Staff', path: '/team', icon: 'UserCog' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  religion: {
    name: 'Religion',
    icon: '⛪',
    terms: {
      client: 'Member', clients: 'Members',
      case: 'Group', cases: 'Groups',
      staff: 'Pastor', staffPlural: 'Pastors',
      venue: 'Branch', intake: 'Member Registration',
      hearing: 'Event', hearings: 'Events'},
    roles: [
      { value: 'company_admin', label: 'Senior Pastor' },
      { value: 'elder', label: 'Elder / Deacon' },
      { value: 'group_leader', label: 'Group Leader' },
      { value: 'treasurer', label: 'Treasurer' },
      { value: 'volunteer', label: 'Volunteer' },
      { value: 'member', label: 'Member' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Members', path: '/members', icon: 'Users' },
      { label: 'Groups', path: '/groups', icon: 'Layers' },
      { label: 'Events & Services', path: '/events', icon: 'Calendar' },
      { label: 'Donation & Offerings', path: '/donations', icon: 'HandCoins' },
      { label: 'Volunteers', path: '/volunteers', icon: 'HeartHandshake' },
      { label: 'Sermon Library', path: '/sermons', icon: 'BookOpen' },
      { label: 'Small Groups', path: '/small-groups', icon: 'Users2' },
      { label: 'Prayer Requests', path: '/prayers', icon: 'Star' },
      { label: 'Milestones', path: '/milestones', icon: 'Award' },
      { label: 'Attendance', path: '/attendance', icon: 'CheckSquare' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare2' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  insurance: {
    name: 'Insurance Agency',
    icon: '🛡️',
    terms: {
      client: 'Policyholder', clients: 'Policyholders',
      case: 'Claim', cases: 'Claims',
      staff: 'Agent', staffPlural: 'Agents',
      venue: 'Branch', intake: 'Policy Application',
      hearing: 'Meeting', hearings: 'Meetings'},
    roles: [
      { value: 'company_admin', label: 'Agency Director' },
      { value: 'underwriter', label: 'Underwriter' },
      { value: 'agent', label: 'Insurance Agent' },
      { value: 'claims_adjuster', label: 'Claims Adjuster' },
      { value: 'finance', label: 'Finance Officer' },
      { value: 'client', label: 'Customer (Portal)' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Policies', path: '/policies', icon: 'Shield' },
      { label: 'Claims', path: '/claims', icon: 'AlertCircle' },
      { label: 'Leads / CRM', path: '/leads', icon: 'UserPlus' },
      { label: 'Customers', path: '/clients', icon: 'Users' },
      { label: 'Premium Collection', path: '/premiums', icon: 'CreditCard' },
      { label: 'Underwriting', path: '/underwriting', icon: 'FileSearch' },
      { label: 'Agent Performance', path: '/agent-performance', icon: 'TrendingUp' },
      { label: 'Billing', path: '/billing', icon: 'Receipt' },
      { label: 'Staff', path: '/team', icon: 'UserCog' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  retail: {
    name: 'Retail / POS',
    icon: '🛒',
    terms: {
      client: 'Customer', clients: 'Customers',
      case: 'Order', cases: 'Orders',
      staff: 'Cashier', staffPlural: 'Staff',
      venue: 'Store', intake: 'New Order',
      hearing: 'Shift', hearings: 'Shifts'},
    roles: [
      { value: 'company_admin', label: 'Store Manager' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'cashier', label: 'Cashier' },
      { value: 'inventory_manager', label: 'Inventory Manager' },
      { value: 'finance', label: 'Finance Officer' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Overview', path: '/retail-dashboard', icon: 'LayoutDashboard' },

      { section: 'E-Commerce' },
      { label: 'Store Builder', path: '/store-builder', icon: 'Store' },

      { section: 'Enterprise Operations' },
      { label: 'B2B Wholesale', path: '/b2b-portal', icon: 'Network' },
      { label: 'Franchise Network', path: '/franchise-manager', icon: 'Layers' },

      { section: 'Store Operations' },
      { label: 'Point of Sale', path: '/pos', icon: 'ShoppingCart' },
      { label: 'Inventory', path: '/retail-inventory', icon: 'Package' },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: 'FileText' },
      { label: 'Products', path: '/products', icon: 'Tag' },
      { label: 'Barcodes', path: '/barcodes', icon: 'Barcode' },
      { label: 'Promotions', path: '/promotions', icon: 'Percent' },
      { label: 'Orders', path: '/orders', icon: 'ClipboardList' },
      { label: 'Returns & RMAs', path: '/rmas', icon: 'RotateCcw' },
      { label: 'Sales', path: '/sales', icon: 'Banknote' },
      { label: 'Customers', path: '/retail-customers', icon: 'Users' },
      { label: 'Suppliers', path: '/suppliers', icon: 'Truck' },
      { label: 'Loyalty Program', path: '/loyalty', icon: 'Star' },
      { label: 'Shifts', path: '/shifts', icon: 'Clock' },
      { label: 'Billing', path: '/billing', icon: 'Receipt' },
      { label: 'Staff', path: '/team', icon: 'UserCog' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  logistics: {
    name: 'Logistics',
    icon: '🚚',
    terms: {
      client: 'Shipper', clients: 'Shippers',
      case: 'Shipment', cases: 'Shipments',
      staff: 'Driver', staffPlural: 'Drivers',
      venue: 'Hub', intake: 'Pickup Request',
      hearing: 'Dispatch', hearings: 'Dispatches'},
    roles: [
      { value: 'company_admin', label: 'Operations Manager' },
      { value: 'dispatcher', label: 'Dispatcher' },
      { value: 'driver', label: 'Driver' },
      { value: 'warehouse_staff', label: 'Warehouse Staff' },
      { value: 'finance', label: 'Finance Officer' },
      { value: 'client', label: 'Customer (Tracking)' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      
      { section: 'Shipments', label: 'Shipments', path: '/shipments', icon: 'Package' },
      { label: 'Pickups', path: '/pickups', icon: 'MapPin' },
      { label: 'Load Board', path: '/load-board', icon: 'PackageSearch' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Scan' },

      { section: 'Fleet', label: 'Vehicles', path: '/fleet', icon: 'Car' },
      { label: 'Drivers', path: '/drivers', icon: 'Truck' },

      { section: 'Routing', label: 'Dispatch', path: '/dispatch-board', icon: 'LayoutGrid' },

      { label: 'Inventory', path: '/warehouse', icon: 'Warehouse' },

      { label: 'Customers', path: '/clients', icon: 'Users' },
      { label: 'Billing', path: '/billing', icon: 'Receipt' },
      
      { label: 'Analytics', path: '/logistics-analytics', icon: 'BarChart2' },
      { label: 'Reports', path: '/reports', icon: 'FileText' },
      
      { section: 'System', label: 'Team', path: '/team', icon: 'UserCog' },
      { label: 'HR', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  hr: {
    name: 'HR / ERP',
    icon: '👥',
    terms: {
      client: 'Employee', clients: 'Employees',
      case: 'Project', cases: 'Projects',
      staff: 'Manager', staffPlural: 'Managers',
      venue: 'Department', intake: 'Job Application',
      hearing: 'Interview', hearings: 'Interviews'},
    roles: [
      { value: 'company_admin', label: 'HR Director' },
      { value: 'hr_manager', label: 'HR Manager' },
      { value: 'recruiter', label: 'Recruiter' },
      { value: 'department_head', label: 'Department Head' },
      { value: 'payroll_officer', label: 'Payroll Officer' },
      { value: 'employee', label: 'Employee' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Employees', path: '/hr/employees', icon: 'Users' },
      { label: 'Departments', path: '/hr/departments', icon: 'Building2' },
      { label: 'Roles', path: '/hr/roles', icon: 'Shield' },
      { label: 'Leave', path: '/hr/leave', icon: 'CalendarHeart' },
      { label: 'Attendance', path: '/hr/attendance', icon: 'Clock' },
      { label: 'Payroll', path: '/hr/payroll', icon: 'BadgeDollarSign' },
      { label: 'Performance', path: '/hr/performance', icon: 'Target' },
      { label: 'Training', path: '/hr/training', icon: 'GraduationCap' },
      { label: 'Recruitment', path: '/hr/recruitment', icon: 'UserPlus' },
      { label: 'Complaints', path: '/hr/complaints', icon: 'AlertCircle' },
      { label: 'Promotions', path: '/hr/promotions', icon: 'ArrowUpCircle' },
      { label: 'Salary', path: '/hr/salary', icon: 'Wallet' },
      { label: 'Applicant Tracking', path: '/ats', icon: 'UserCheck' },
      { label: 'Onboarding', path: '/onboarding', icon: 'ClipboardCheck' },
      { label: 'Benefits & Rewards', path: '/benefits', icon: 'Gift' },
      { label: 'Expenses', path: '/expenses', icon: 'Receipt' },
      { label: 'Company Intranet', path: '/intranet', icon: 'Globe' },
      { label: 'Analytics & AI', path: '/hr-analytics', icon: 'BrainCircuit' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
      { label: 'Reports', path: '/reports', icon: 'BarChart2' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  real_estate: {
    name: 'Real Estate',
    icon: '🏠',
    terms: {
      client: 'Client', clients: 'Clients',
      case: 'Property', cases: 'Properties',
      staff: 'Agent', staffPlural: 'Agents',
      venue: 'Office', intake: 'Client Registration',
      hearing: 'Viewing', hearings: 'Viewings'},
    roles: [
      { value: 'company_admin', label: 'Broker / Owner' },
      { value: 'agent', label: 'Real Estate Agent' },
      { value: 'property_manager', label: 'Property Manager' },
      { value: 'accountant', label: 'Accountant' },
      { value: 'finance', label: 'Finance Officer' },
      { value: 'admin', label: 'Office Administrator' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      
      { section: 'Properties & Transactions', label: 'Properties', path: '/real-estate/properties', icon: 'Home' },
      { label: 'Clients', path: '/real-estate/clients', icon: 'Users' },
      { label: 'Viewings', path: '/real-estate/viewings', icon: 'Eye' },
      { label: 'Offers', path: '/real-estate/offers', icon: 'FileText' },
      { label: 'Counter Offers', path: '/real-estate/counter-offers', icon: 'MessageCircle' },
      { label: 'Transactions', path: '/real-estate/transactions', icon: 'Banknote' },
      
      { section: 'Finance & Accounting', label: 'Trust Accounting', path: '/real-estate/trust-accounting', icon: 'Wallet' },
      { label: 'Firm Accounting', path: '/finance/accounting', icon: 'Landmark' },
      { label: 'Chart of Accounts', path: '/finance/accounting?tab=coa', icon: 'BookOpen' },
      { label: 'Invoices (AR)', path: '/finance/accounting?tab=invoices', icon: 'Receipt' },
      { label: 'Bills Payable (AP)', path: '/finance/accounting?tab=bills', icon: 'FileText' },
      { label: 'General Ledger', path: '/finance/accounting?tab=jv', icon: 'LineChart' },
      { label: 'Bank Feed Rec', path: '/finance/accounting?tab=bankrec', icon: 'CheckCircle2' },
      { label: 'Fixed Assets', path: '/finance/accounting?tab=assets', icon: 'Building2' },
      { label: 'Escrow Accounts', path: '/real-estate/escrow', icon: 'Lock' },
      { label: 'Commissions', path: '/real-estate/commissions', icon: 'TrendingUp' },
      { label: 'Commission Rules', path: '/real-estate/commission-rules', icon: 'Settings' },
      
      { section: 'Leasing & Rent', label: 'Leases', path: '/real-estate/leases', icon: 'FileCheck' },
      { label: 'Lease Renewals', path: '/real-estate/lease-renewals', icon: 'RotateCcw' },
      { label: 'Rent Payments', path: '/real-estate/rent-payments', icon: 'CreditCard' },
      { label: 'Payment Schedules', path: '/real-estate/payment-schedules', icon: 'Calendar' },
      
      { section: 'Operations', label: 'Maintenance', path: '/real-estate/maintenance', icon: 'Wrench' },
      { label: 'Contractors', path: '/real-estate/contractors', icon: 'Users2' },
      { label: 'Contractor Reviews', path: '/real-estate/contractor-reviews', icon: 'Star' },
      
      { section: 'Documents & Agreements', label: 'Documents', path: '/documents', icon: 'FolderOpen' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'FileText' },
      { label: 'E-Signatures', path: '/real-estate/e-signatures', icon: 'PenTool' },
      
      { section: 'Intelligence & Analytics', label: 'Market Intelligence', path: '/real-estate/market-data', icon: 'Globe' },
      { label: 'Comparable Properties', path: '/real-estate/comparable-properties', icon: 'Layers' },
      { label: 'Agent Metrics', path: '/real-estate/agent-metrics', icon: 'BarChart2' },
      { label: 'Recommendations', path: '/real-estate/recommendations', icon: 'Brain' },
      
      { section: 'Administration', label: 'Analytics', path: '/real-estate/analytics', icon: 'LineChart' },
      { label: 'Reports', path: '/reports', icon: 'FileText' },
      { label: 'Audit Log', path: '/real-estate/audit-log', icon: 'ClipboardList' },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  // ── JCL Royal Group — Isolated Real Estate Vertical ────────────────────────
  // This is a dedicated copy of the real_estate vertical for JCL Royal Group.
  // It is intentionally identical to real_estate so that existing role strings,
  // nav paths, and page components work without modification.
  // DO NOT add it to ALL_INDUSTRY_KEYS in industryVisibility.js — it must
  // remain invisible in all customer-facing industry pickers.
  real_estate_jcl: {
    name: 'Real Estate',
    icon: '🏠',
    terms: {
      client: 'Client', clients: 'Clients',
      case: 'Property', cases: 'Properties',
      staff: 'Agent', staffPlural: 'Agents',
      venue: 'Office', intake: 'Client Registration',
      hearing: 'Viewing', hearings: 'Viewings'},
    roles: [
      { value: 'company_admin', label: 'Broker / Owner' },
      { value: 'agent', label: 'Real Estate Agent' },
      { value: 'property_manager', label: 'Property Manager' },
      { value: 'accountant', label: 'Accountant' },
      { value: 'finance', label: 'Finance Officer' },
      { value: 'admin', label: 'Office Administrator' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [
      { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
      { label: 'Live GPS', path: '/real-estate/field-tracker', icon: 'Navigation' },
      { label: 'Field GPS', path: '/real-estate/marketer-tracker', icon: 'MapPin' },
      { label: 'Land Parcels', path: '/real-estate/land', icon: 'Compass' },
      { label: 'Leads', path: '/real-estate/crm-leads', icon: 'Sparkles' },
      { label: 'Clients', path: '/real-estate/clients', icon: 'Users' },
      { label: 'Timeline', path: '/real-estate/customer-timeline', icon: 'Clock' },
      { label: 'Viewings', path: '/real-estate/viewings', icon: 'Eye' },
      { label: 'Offers', path: '/real-estate/offers', icon: 'FileText' },
      { label: 'Counter Offers', path: '/real-estate/counter-offers', icon: 'MessageCircle' },
      { label: 'Deals', path: '/real-estate/transactions', icon: 'Banknote' },
      { label: 'Properties', path: '/real-estate/properties', icon: 'Home' },
      { label: 'Leases', path: '/real-estate/leases', icon: 'FileCheck' },
      { label: 'Renewals', path: '/real-estate/lease-renewals', icon: 'RotateCcw' },
      { label: 'Maintenance', path: '/real-estate/maintenance', icon: 'Wrench' },
      { label: 'Contractors', path: '/real-estate/contractors', icon: 'Users2' },
      { label: 'Reviews', path: '/real-estate/contractor-reviews', icon: 'Star' },
      { label: 'Trust Accounting', path: '/real-estate/trust-accounting', icon: 'Wallet' },
      { label: 'Escrow', path: '/real-estate/escrow', icon: 'Lock' },
      { label: 'Rent Payments', path: '/real-estate/rent-payments', icon: 'CreditCard' },
      { label: 'Payment Schedules', path: '/real-estate/payment-schedules', icon: 'Calendar' },
      { label: 'Commissions', path: '/real-estate/commissions', icon: 'TrendingUp' },
      { label: 'Commission Rules', path: '/real-estate/commission-rules', icon: 'Settings' },
      { label: 'Invoices', path: '/invoices', icon: 'Receipt' },
      { label: 'Projects', path: '/tasks', icon: 'Briefcase' },
      { label: 'HR & Team', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Smart Docs', path: '/smart-docs', icon: 'FileText' },
      { label: 'E-Signatures', path: '/real-estate/e-signatures', icon: 'PenTool' },
      { label: 'Analytics', path: '/real-estate/analytics', icon: 'LineChart' },
      { label: 'Reports', path: '/reports', icon: 'FileText' },
      { label: 'Audit Log', path: '/real-estate/audit-log', icon: 'ClipboardList' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },
      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  pharmacy: {
    name: 'Pharmacy',
    icon: '💊',
    terms: {
      client: 'Patient', clients: 'Patients',
      case: 'Prescription', cases: 'Prescriptions',
      staff: 'Pharmacist', staffPlural: 'Pharmacists',
      venue: 'Branch', intake: 'Prescription Input',
      hearing: 'Refill', hearings: 'Refills'},
    roles: [
      { value: 'company_admin', label: 'Pharmacy Manager' },
      { value: 'pharmacist', label: 'Pharmacist' },
      { value: 'pharmacy_technician', label: 'Pharmacy Technician' },
      { value: 'cashier', label: 'Cashier' },
      { value: 'inventory_manager', label: 'Inventory Manager' },
      { value: 'finance', label: 'Finance Officer' },
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Dashboard', path: '/pharmacy/dashboard', icon: 'LayoutDashboard' },
      
      { section: 'Core Operations' },
      { label: 'Point of Sale', path: '/pharmacy/pos', icon: 'ShoppingCart' },
      { label: 'Prescriptions', path: '/pharmacy/prescriptions', icon: 'FileText' },
      { label: 'Patients', path: '/pharmacy/customers', icon: 'Users' },
      
      { section: 'Inventory & Stock' },
      { label: 'Drug Catalog', path: '/pharmacy/drugs', icon: 'Pill' },
      { label: 'Inventory', path: '/pharmacy/inventory', icon: 'Package' },
      
      { section: 'Financial & Claims' },
      { label: 'Insurance Claims', path: '/pharmacy/claims', icon: 'FileCheck' },
      { label: 'Reports', path: '/pharmacy/reports', icon: 'BarChart2' },
      
      { section: 'Administration' },
      { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]},

  slate: {
    name: 'Slate Admin',
    icon: '⚙️',
    terms: {
      client: 'Firm', clients: 'Firms',
      case: 'Subscription', cases: 'Subscriptions',
      staff: 'Admin', staffPlural: 'Admins',
      venue: 'Data Center', intake: 'Firm Onboarding',
      hearing: 'Audit Event', hearings: 'Audit Events'},
    roles: [
      { value: 'super_admin', label: 'Platform Administrator' }
    ],

    departments: [
      { value: 'admin', label: 'Administration' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'operations', label: 'Operations' },
      { value: 'tech', label: 'IT & Support' }
    ],    nav: [

      { label: 'Platform Overview', path: '/admin', icon: 'LayoutDashboard' },
      { label: 'Firms & Quotas', path: '/admin/firms', icon: 'Building2' },
      { label: 'System Users', path: '/admin/users', icon: 'Users2' },
      { label: 'Pricing & Plans', path: '/admin/pricing', icon: 'Crown' },
      { label: 'Revenue & Billing', path: '/admin/billing', icon: 'CreditCard' },
      { label: 'Security & Audit', path: '/admin/security', icon: 'Shield' },
      { label: 'System Broadcasts', path: '/admin/broadcasts', icon: 'BellRing' },
      { label: 'Enterprise Requests', path: '/admin/enterprise-requests', icon: 'Building2' },
      { label: 'Partner Applications', path: '/admin/partners', icon: 'Handshake' },

      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' },
    ]
  },

  optavel: {
    name: 'Software',
    icon: '🚀',
    terms: {
      client: 'Customer', clients: 'Customers',
      case: 'Project', cases: 'Projects',
      staff: 'Team Member', staffPlural: 'Team Members',
      venue: 'Workspace', intake: 'Onboarding',
      hearing: 'Milestone', hearings: 'Milestones'},
    roles: [
      { value: 'company_admin', label: 'CEO' },
      { value: 'cto', label: 'CTO / Engineering' },
      { value: 'pm', label: 'Product Manager' },
      { value: 'growth_partner', label: 'Founding Growth Partner' },
      { value: 'sales', label: 'Sales' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'HR' },
      { value: 'support', label: 'Support' }
    ],
    departments: [
      { value: 'executive', label: 'Executive' },
      { value: 'product_eng', label: 'Product & Engineering' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'sales', label: 'Sales' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'support', label: 'Customer Support' },
      { value: 'partnerships', label: 'Partnerships & Growth' }
    ],
    nav: [

      { label: 'Dashboard', path: '/optavel', icon: 'LayoutDashboard' },
      { label: 'Executive', path: '/optavel/executive', icon: 'BarChart2' },
      { label: 'Product & Eng', path: '/optavel/product', icon: 'Code' },
      { label: 'Marketing', path: '/optavel/marketing', icon: 'Megaphone' },
      { label: 'Sales', path: '/optavel/sales', icon: 'TrendingUp' },
      { label: 'Finance', path: '/optavel/finance', icon: 'DollarSign' },
      { label: 'Support', path: '/optavel/support', icon: 'LifeBuoy' },
      { label: 'Partnerships', path: '/optavel/partnerships', icon: 'Handshake' },
      { label: 'Integrations', path: '/integrations', icon: 'Blocks' },
      { label: 'Automations', path: '/automations', icon: 'Zap' },


      { label: 'Settings', path: '/settings', icon: 'Settings' }
    ]
  }
};

import { EDUCATION_LEVELS } from './educationLevels';

export const getIndustryTerms = (industryKey, educationLevel) => {
  const ind = INDUSTRIES[industryKey] || INDUSTRIES.law;
  
  if (industryKey === 'school' && educationLevel && EDUCATION_LEVELS[educationLevel]) {
    return { ...ind.terms, ...EDUCATION_LEVELS[educationLevel].terms };
  }
  
  return ind.terms;
};

import i18n from '@/i18n/config.js';

export const getTerm = (industryKey, termKey, educationLevel) => {
  const terms = getIndustryTerms(industryKey, educationLevel);
  const englishTerm = terms[termKey] || termKey;
  const translationKey = `industry_${industryKey}_${termKey}`;
  return i18n.t(translationKey, { defaultValue: englishTerm });
};

export const getIndustryNav = (industryKey, educationLevel) => {
  const ind = INDUSTRIES[industryKey] || INDUSTRIES.law;
  let nav = [...ind.nav];
  
  // Remove roles and staff
  nav = nav.filter(n => !['/roles', '/team'].includes(n.path));

  if (industryKey === 'school' && educationLevel && EDUCATION_LEVELS[educationLevel]) {
     const allowedModules = EDUCATION_LEVELS[educationLevel].modules;
     nav = nav.filter(n => allowedModules.includes(n.path) || n.path === '/' || n.path === '/settings' || n.path === '/integrations' || n.path === '/hr' || n.path === '/smart-docs' || n.path === '/tasks');
  }
  
  // Ensure Email Inbox exists globally across all industries
  if (!nav.find(n => n.path === '/email-inbox')) {
    // Insert it right before Integrations/Settings
    const insertIndex = Math.max(0, nav.length - 2);
    nav.splice(insertIndex, 0, { label: 'Email Inbox', path: '/email-inbox', icon: 'Mail' });
  }

  // Ensure Chat exists globally
  if (!nav.find(n => n.path === '/chat')) {
    // Insert it before Email Inbox
    const insertIndex = Math.max(0, nav.length - 3);
    nav.splice(insertIndex, 0, { label: 'Team Chat', path: '/chat', icon: 'MessageSquare' });
  }

  // Ensure Board exists globally
  if (!nav.find(n => n.path === '/board')) {
    const insertIndex = Math.max(0, nav.length - 3);
    nav.splice(insertIndex, 0, { label: 'Video Calls', path: '/board', icon: 'Video' });
  }

  // Core Engine: HR must exist globally
  if (!nav.find(n => n.path === '/hr')) {
    const insertIndex = Math.max(0, nav.length - 4);
    nav.splice(insertIndex, 0, { label: 'HR & Leave', path: '/hr', icon: 'HeartHandshake' });
  }

  // ── CLIENT PORTAL ─────────────────────────────────────────────────────────
  // Inject the Portal Management link globally for every vertical (admin only)
  if (!nav.find(n => n.path === '/portal')) {
    const insertIndex = nav.findIndex(n => n.path === '/settings');
    nav.splice(insertIndex, 0, { label: 'Client Portal', path: '/portal', icon: 'Globe' });
  }

  return nav;
};

export const getIndustryRoles = (industryKey) => {
  const ind = INDUSTRIES[industryKey] || INDUSTRIES.law;
  const roles = ind.roles ? [...ind.roles] : [];
  
  // Ensure "Company Admin" is always a default feature across all industries
  if (!roles.find(r => r.value === 'company_admin')) {
    roles.unshift({ value: 'company_admin', label: 'Company Admin' });
  } else {
    // Optionally update the label so it explicitly says Company Admin 
    // instead of a confusing alias like "Managing Partner" for cross-industry clarity
    const idx = roles.findIndex(r => r.value === 'company_admin');
    if (idx !== -1 && roles[idx].label !== 'Company Admin') {
      roles[idx] = { ...roles[idx], label: 'Company Admin' };
    }
  }

  return roles;
};

export const clientNav = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Cases / Projects', path: '/client-cases', icon: 'Briefcase' },
  { label: 'Team Chat', path: '/chat', icon: 'MessageSquare' },
  { label: 'Video Calls', path: '/board', icon: 'Video' },
  { label: 'Billing', path: '/billing', icon: 'Receipt' },
  { label: 'Smart Docs', path: '/smart-docs', icon: 'Brain' },
  { label: 'Settings', path: '/settings', icon: 'Settings' }
];


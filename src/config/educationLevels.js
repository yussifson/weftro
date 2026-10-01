export const EDUCATION_LEVELS = {
  preschool: {
    label: 'Preschool / Kindergarten',
    terms: {
      student: 'Child', students: 'Children',
      teacher: 'Educator', teachers: 'Educators',
      class: 'Room', classes: 'Rooms'
    },
    modules: ['/students', '/parents', '/teachers', '/classes', '/attendance', '/fees', '/notices', '/child-development', '/student-portal', '/parent-portal', '/documents', '/chat', '/board', '/email-inbox', ]
  },
  primary: {
    label: 'Primary / Elementary School',
    terms: {
      student: 'Pupil', students: 'Pupils',
      teacher: 'Teacher', teachers: 'Teachers',
      class: 'Class', classes: 'Classes'
    },
    modules: ['/students', '/parents', '/teachers', '/classes', '/timetable', '/assignments', '/attendance', '/grades', '/exams', '/discipline', '/fees', '/library', '/transport', '/notices', '/student-portal', '/parent-portal', '/documents', '/chat', '/board', '/email-inbox']
  },
  jhs: {
    label: 'Junior High School',
    terms: {
      student: 'Student', students: 'Students',
      teacher: 'Teacher', teachers: 'Teachers',
      class: 'Class', classes: 'Classes'
    },
    modules: ['/students', '/parents', '/teachers', '/classes', '/timetable', '/assignments', '/attendance', '/grades', '/exams', '/discipline', '/fees', '/library', '/transport', '/hostel', '/notices', '/student-portal', '/parent-portal', '/documents', '/chat', '/board', '/email-inbox']
  },
  shs: {
    label: 'Senior High School',
    terms: {
      student: 'Student', students: 'Students',
      teacher: 'Teacher', teachers: 'Teachers',
      class: 'Form', classes: 'Forms'
    },
    modules: ['/s/', '/s/students', '/s/student-profiles', '/s/promotion', '/s/transfers', '/s/discipline', '/s/medical', '/s/admissions', '/s/applicant-review', '/s/admission-decisions', '/s/enrollment', '/s/classes', '/s/programmes', '/s/houses', '/s/streams', '/s/subjects', '/s/electives', '/s/academic-calendar', '/s/timetable', '/s/daily-attendance', '/s/class-attendance', '/s/teacher-attendance', '/s/attendance-reports', '/s/internal-exams', '/s/mock-exams', '/s/assessment', '/s/grades', '/s/results', '/s/report-cards', '/s/dormitories', '/s/room-allocation', '/s/house-masters', '/s/boarding-attendance', '/s/parent-progress', '/s/parent-attendance', '/s/parent-fees', '/s/parent-comms', '/s/fees', '/s/invoices', '/s/payments', '/s/scholarships', '/s/financial-reports', '/s/books', '/s/borrowing', '/s/returns', '/s/digital-resources', '/s/buses', '/s/bus-routes', '/s/bus-assignments', '/s/notices', '/s/sms', '/s/whatsapp', '/s/email-comms', '/s/academic-analytics', '/s/attendance-analytics', '/s/financial-analytics']
  },
  university: {
    label: 'University / College',
    terms: {
      student: 'Undergraduate', students: 'Undergraduates',
      teacher: 'Lecturer', teachers: 'Lecturers',
      class: 'Course', classes: 'Courses'
    },
    modules: ['/students', '/parents', '/teachers', '/classes', '/faculties', '/departments', '/timetable', '/assignments', '/attendance', '/grades', '/exams', '/fees', '/library', '/hostel', '/notices', '/research-grants', '/student-portal', '/parent-portal', '/documents', '/chat', '/board', '/email-inbox']
  },
  online: {
    label: 'Online Learning Platform',
    terms: {
      student: 'Learner', students: 'Learners',
      teacher: 'Instructor', teachers: 'Instructors',
      class: 'Course', classes: 'Courses'
    },
    modules: ['/students', '/teachers', '/classes', '/lms', '/assignments', '/exams', '/certificates', '/fees', '/notices', '/student-portal', '/parent-portal', '/documents', '/chat', '/board', '/email-inbox']
  },
  vocational: {
    label: 'Vocational / Technical',
    terms: {
      student: 'Trainee', students: 'Trainees',
      teacher: 'Instructor', teachers: 'Instructors',
      class: 'Workshop', classes: 'Workshops'
    },
    modules: ['/students', '/teachers', '/classes', '/timetable', '/assignments', '/attendance', '/grades', '/exams', '/fees', '/notices', '/student-portal', '/parent-portal', '/documents', '/chat', '/board', '/email-inbox']
  }
};

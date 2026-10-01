import { base44 } from './base44Client';

class SchoolAPI {
  // Get school settings (first school_settings record for this company)
  async getSettings(companyId) {
    try {
      const records = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'school_settings'
      });
      if (records.length === 0) return null;
      const r = records[0];
      let data = {};
      try { data = typeof r.notes === 'string' ? JSON.parse(r.notes) : (r.notes || {}); } catch(e) {}
      return { id: r.id, ...data };
    } catch (error) {
      console.error('[SchoolAPI] Get settings error:', error);
      return null;
    }
  }

  // Helper: get all students for a company (returns mapped data)
  async getStudents(companyId) {
    try {
      const records = await base44.entities.LegalCase.filter({
        company_id: companyId,
        case_type: 'school_student'
      });
      return records.map(r => {
        let data = {};
        try { data = typeof r.notes === 'string' ? JSON.parse(r.notes) : (r.notes || {}); } catch(e) {}
        return { id: r.id, ...data };
      });
    } catch (error) {
      console.error('[SchoolAPI] Get students error:', error);
      return [];
    }
  }

  // Grade levels for Ghana basic school
  getGradeLevels() {
    return ['KG', 'Primary', 'JHS'];
  }

  // Class names by level
  getClassNames(level) {
    const map = {
      KG: ['KG 1', 'KG 2'],
      Primary: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
      JHS: ['JHS 1 (Basic 7)', 'JHS 2 (Basic 8)', 'JHS 3 (Basic 9)']
    };
    return map[level] || [];
  }

  // Standard subjects for basic school
  getSubjects() {
    return [
      'Mathematics', 'English Language', 'Integrated Science',
      'Social Studies', 'ICT', 'Ghanaian Language', 'French',
      'Religious & Moral Education', 'Physical Education', 'Creative Arts'
    ];
  }

  // Calculate letter grade
  calcGrade(score, maxScore = 100) {
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (pct >= 80) return { letter: 'A', label: 'Excellent' };
    if (pct >= 65) return { letter: 'B', label: 'Very Good' };
    if (pct >= 50) return { letter: 'C', label: 'Good' };
    if (pct >= 40) return { letter: 'D', label: 'Pass' };
    return { letter: 'F', label: 'Fail' };
  }

  // Generate student ID
  generateStudentId() {
    return 'STU-' + Date.now().toString(36).toUpperCase().slice(-6);
  }

  // Generate receipt number
  generateReceiptNumber() {
    return 'REC-' + Date.now().toString(36).toUpperCase().slice(-6);
  }
}

export default new SchoolAPI();

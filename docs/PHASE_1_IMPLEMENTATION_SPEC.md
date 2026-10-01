# Real Estate Module - Phase 1 Implementation Specification

## Overview
Phase 1 focuses on closing critical gaps that prevent the system from competing with enterprise RE software. Estimated timeline: 12-16 weeks.

---

## Feature 1: Lead Pipeline Management

### Business Requirements
- Centralized lead tracking with status progression
- Lead scoring based on engagement
- Activity timeline (calls, emails, meetings, notes)
- Lead source attribution for marketing ROI

### Database Schema

```sql
-- Leads Table (Enhanced from current clients)
CREATE TABLE IF NOT EXISTS univ_re_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'web', -- Zillow, Realtor.com, referral, web, cold_call, door_knock, social
  property_type_preference TEXT, -- single_family, condo, multi_family, commercial
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  timeline TEXT DEFAULT 'soon', -- soon, 3_6_months, 6_12_months, just_browsing
  status TEXT DEFAULT 'lead', -- lead, contacted, qualified, offer_made, closed, lost
  score INTEGER DEFAULT 0, -- 0-100
  assigned_agent_id TEXT,
  assigned_agent_name TEXT,
  activity_count INTEGER DEFAULT 0,
  last_activity_date TIMESTAMPTZ,
  interests JSONB DEFAULT '[]'::jsonb, -- [{property_id, date}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities Table
CREATE TABLE IF NOT EXISTS univ_re_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  lead_id UUID NOT NULL REFERENCES univ_re_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- call, email, sms, meeting, note, showing
  duration_minutes INTEGER, -- for calls
  notes TEXT,
  outcome TEXT, -- for calls: interested, not_interested, callback, voicemail
  created_by TEXT NOT NULL, -- agent_id
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lead Scoring Rules Table
CREATE TABLE IF NOT EXISTS univ_re_lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  rule_name TEXT,
  condition TEXT, -- JSON condition
  points_added INTEGER,
  active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_univ_re_leads_company_id ON univ_re_leads(company_id);
CREATE INDEX idx_univ_re_leads_status ON univ_re_leads(status);
CREATE INDEX idx_univ_re_leads_assigned_agent ON univ_re_leads(assigned_agent_id);
CREATE INDEX idx_univ_re_leads_score ON univ_re_leads(score DESC);
CREATE INDEX idx_univ_re_activities_lead_id ON univ_re_activities(lead_id);
CREATE INDEX idx_univ_re_activities_company_id ON univ_re_activities(company_id);
```

### API Endpoints Needed

```javascript
// Lead Management
leadAPI.getLeads(companyId, filters={status, score_min, source})
leadAPI.createLead(companyId, data)
leadAPI.updateLead(companyId, leadId, data)
leadAPI.deleteLead(companyId, leadId)
leadAPI.scoreLead(companyId, leadId) // Recalculate score

// Lead Activities
leadAPI.addActivity(companyId, leadId, activityData)
leadAPI.getActivities(companyId, leadId)
leadAPI.getActivityStats(companyId, leadId) // call count, email count, etc.

// Lead Scoring
leadAPI.getScoringRules(companyId)
leadAPI.createScoringRule(companyId, ruleData)
leadAPI.batchRescore(companyId) // Recalculate all leads
```

### UI Components Needed

1. **Lead Pipeline Board** (Kanban)
   - 5 columns: Lead (0-25 score) | Contacted (25-50 score) | Qualified (50-75 score) | Offer Made (75-90 score) | Closed (90-100 score)
   - Drag-drop to move between stages
   - Lead cards showing: name, phone, budget, last_activity_date, score badge
   - Quick actions: Call, Email, Schedule Meeting

2. **Lead Detail Page**
   - Header: Name, phone, email, assigned agent
   - Stats: Score, source, timeline, budget range
   - Activity timeline (chronological)
   - Quick add activity form
   - Related properties (interested_in)
   - Next steps / tasks

3. **Lead List View**
   - Table: Name | Source | Status | Score | Budget | Assigned To | Last Activity
   - Filters: Status, Score range, Source, Date range
   - Bulk actions: Assign, Re-score, Delete
   - Search: By name, phone, email

4. **Activity Feed**
   - Per-lead: List all activities with timestamps
   - Show: Type, outcome, duration, notes, created_by
   - Quick log new activity

### Business Logic / Scoring Algorithm

```javascript
function calculateLeadScore(lead, activities) {
  let score = 0;
  
  // Recency (0-20 points)
  const daysSinceActivity = (new Date() - new Date(lead.last_activity_date)) / (1000 * 60 * 60 * 24);
  if (daysSinceActivity < 7) score += 20;
  else if (daysSinceActivity < 30) score += 15;
  else if (daysSinceActivity < 90) score += 10;
  
  // Frequency (0-20 points)
  score += Math.min(20, activities.length);
  
  // Engagement Type (0-30 points)
  const callCount = activities.filter(a => a.type === 'call').length;
  const meetingCount = activities.filter(a => a.type === 'meeting').length;
  const emailCount = activities.filter(a => a.type === 'email').length;
  score += Math.min(30, (callCount * 5) + (meetingCount * 10) + (emailCount * 2));
  
  // Budget Provided (0-15 points)
  if (lead.budget_min && lead.budget_max) score += 15;
  
  // Timeline (0-15 points)
  if (lead.timeline === 'soon') score += 15;
  else if (lead.timeline === '3_6_months') score += 8;
  else if (lead.timeline === '6_12_months') score += 3;
  
  return Math.min(100, score);
}
```

---

## Feature 2: Transaction Workflow Stages

### Business Requirements
- Track deals from pending → closed with defined stages
- Automatic task generation
- Contingency tracking
- State transition validation

### Database Schema

```sql
-- Transaction Stages (Enhanced from current transactions table)
CREATE TABLE IF NOT EXISTS univ_re_transaction_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES univ_re_transactions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- pending, under_contract, inspection, appraisal, underwriting, clear_to_close, closed
  entered_date TIMESTAMPTZ DEFAULT now(),
  expected_completion_date DATE,
  actual_completion_date DATE,
  notes TEXT,
  completed_by TEXT, -- agent who moved to this stage
  completed_at TIMESTAMPTZ
);

-- Contingencies Table
CREATE TABLE IF NOT EXISTS univ_re_contingencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES univ_re_transactions(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- inspection, appraisal, loan, title, other
  description TEXT,
  status TEXT DEFAULT 'open', -- open, satisfied, waived, failed, failed_contingency_release
  deadline DATE,
  resolved_date DATE,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction Tasks (Auto-generated per stage)
CREATE TABLE IF NOT EXISTS univ_re_transaction_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  task_name TEXT,
  task_type TEXT, -- inspection, appraisal, title, lender_contact, document_request, etc.
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  assigned_to TEXT, -- agent_id
  due_date DATE,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stage Transition Rules
CREATE TABLE IF NOT EXISTS univ_re_stage_transition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  required_contingencies TEXT[], -- ARRAY of types that must be satisfied
  required_documents TEXT[], -- ARRAY of doc types needed
  auto_generate_tasks BOOLEAN DEFAULT true
);
```

### API Endpoints

```javascript
transactionAPI.updateStage(companyId, transactionId, newStage, notes)
transactionAPI.getStageHistory(companyId, transactionId)
transactionAPI.addContingency(companyId, transactionId, contingencyData)
transactionAPI.updateContingency(companyId, contingencyId, status, notes)
transactionAPI.getContingencies(companyId, transactionId)
transactionAPI.getTasks(companyId, transactionId)
transactionAPI.completeTask(companyId, taskId)
transactionAPI.canTransitionStage(companyId, transactionId, toStage) // validation
```

### UI Components

1. **Transaction Detail - Stage Timeline**
   - Horizontal timeline showing all stages
   - Current stage highlighted
   - Click to see stage details (entered date, notes, completed by)
   - Contingency checklist
   - Tasks list

2. **Contingency Tracker**
   - List: Type | Description | Status | Deadline | Resolution
   - Bulk mark as "Satisfied", "Waived"
   - Color code: Red (open & overdue) | Yellow (open) | Green (satisfied)

3. **Task Management**
   - Auto-generated tasks shown
   - Manual task creation
   - Assign to team member
   - Mark complete

---

## Feature 3: Advanced Commission Tracking

### Business Requirements
- Support agent/broker splits
- Co-brokered transaction splits
- Commission schedules
- Commission holdbacks

### Database Schema

```sql
-- Commission Details (Enhanced)
CREATE TABLE IF NOT EXISTS univ_re_commission_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES univ_re_commissions(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  commission_rate DECIMAL(5,2), -- percentage
  commission_amount DECIMAL(15,2),
  split_percentage DECIMAL(5,2), -- if split deal
  co_agent_id TEXT, -- if co-brokered
  co_agent_name TEXT,
  co_agent_commission DECIMAL(15,2),
  payment_status TEXT DEFAULT 'pending', -- pending, partial, paid, disputed
  payment_date DATE,
  holdback_amount DECIMAL(15,2) DEFAULT 0,
  holdback_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Commission Schedules (By company policy)
CREATE TABLE IF NOT EXISTS univ_re_commission_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT, -- "Standard", "New Agent", "Team Lead"
  commission_rate DECIMAL(5,2),
  volume_tier_min DECIMAL(15,2), -- if >= this volume
  volume_tier_max DECIMAL(15,2),
  active BOOLEAN DEFAULT true
);
```

### API Endpoints

```javascript
commissionAPI.calculateCommission(companyId, transactionData)
commissionAPI.getCommissionDetails(companyId, commissionId)
commissionAPI.recordCommissionPayment(companyId, commissionId, amount, date)
commissionAPI.getAgentCommissions(companyId, agentId, dateRange)
commissionAPI.getCommissionSchedules(companyId)
commissionAPI.createCommissionSchedule(companyId, scheduleData)
```

---

## Feature 4: Document Management & e-Signatures

### Business Requirements
- Template-based document generation
- Version control
- e-Signature tracking (DocuSign integration)
- Audit trail

### Database Schema

```sql
-- Document Templates
CREATE TABLE IF NOT EXISTS univ_re_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT,
  document_type TEXT, -- offer, addendum, contract, disclosure, etc.
  content TEXT, -- Template with {{variable}} placeholders
  variables JSONB DEFAULT '[]'::jsonb, -- List of placeholders
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generated Documents
CREATE TABLE IF NOT EXISTS univ_re_generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID,
  property_id UUID,
  template_id UUID,
  document_type TEXT,
  file_url TEXT,
  file_name TEXT,
  version INTEGER DEFAULT 1,
  generated_by TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  docusign_envelope_id TEXT,
  signature_status TEXT DEFAULT 'pending', -- pending, signed, rejected
  signed_date TIMESTAMPTZ
);

-- Document Signatures
CREATE TABLE IF NOT EXISTS univ_re_document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  signer_name TEXT,
  signer_email TEXT,
  signature_date DATE,
  ip_address TEXT,
  audit_trail JSONB
);
```

### Integration

```javascript
// DocuSign Integration
docusignAPI.createEnvelope(documentData, signerEmails)
docusignAPI.getEnvelopeStatus(envelopeId)
docusignAPI.downloadSignedDocument(envelopeId)
```

---

## Feature 5: Showing Coordination

### Business Requirements
- Schedule property showings with agent/buyer
- Avoid showing conflicts
- Lock codes and access instructions
- Post-showing feedback

### Database Schema

```sql
-- Showings (Enhanced)
CREATE TABLE IF NOT EXISTS univ_re_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  buyer_id UUID,
  buyer_name TEXT,
  scheduled_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  lock_code TEXT,
  access_instructions TEXT,
  showing_status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Showing Feedback
CREATE TABLE IF NOT EXISTS univ_re_showing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showing_id UUID NOT NULL REFERENCES univ_re_showings(id),
  feedback_submitted_at TIMESTAMPTZ DEFAULT now(),
  buyer_interest_level TEXT, -- low, medium, high
  feedback_score INTEGER, -- 1-10
  feedback_text TEXT,
  follow_up_required BOOLEAN,
  follow_up_date DATE
);

-- Showing Statistics
CREATE TABLE IF NOT EXISTS univ_re_showing_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  total_showings INTEGER DEFAULT 0,
  average_feedback_score DECIMAL(3,1),
  average_interest_level TEXT,
  last_showing_date DATE,
  days_on_market INTEGER,
  avg_days_to_showing INTEGER
);
```

---

## Implementation Timeline Detail

### Week 1-2: Lead Pipeline
- Database schema (3 tables)
- Lead API (CRUD + scoring)
- Lead Pipeline Kanban UI
- Lead detail page
- Scoring algorithm

### Week 3: Transaction Stages
- Database schema (3 tables)
- Stage transition API
- Contingency management API
- Transaction detail enhancement
- Stage timeline UI

### Week 4: Commissions
- Database schema (2 tables)
- Commission calculation engine
- Payment tracking
- Commission detail UI

### Week 5-6: Document Management
- Database schema (3 tables)
- Template management UI
- DocuSign integration
- Document generation
- Signature tracking

### Week 7-8: Showing Coordination
- Database schema (3 tables)
- Showing scheduling UI
- Calendar view
- Feedback forms
- Statistics dashboard

### Week 9-12: Integration & Testing
- Cross-feature integration
- End-to-end testing
- Performance optimization
- Pilot with 5-10 agents
- Feedback loops & fixes

---

## Success Metrics (Phase 1)

### Feature Adoption
- Lead pipeline adoption: > 70% of agents within 2 weeks
- Transaction stage updates: 100% of deals tracked
- Document generation: > 80% of transactions use templates

### Performance
- Lead list load: < 500ms
- Kanban drag-drop: Smooth 60fps
- Scoring recalculation: < 2 seconds for 1000 leads

### Business
- Reduced admin time: 40% less manual data entry
- Faster deal closure: 3-5 days faster average
- Commission accuracy: 99.99% no errors
- Agent satisfaction: > 8/10 rating

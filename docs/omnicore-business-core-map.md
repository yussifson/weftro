# OmniCore Business Core Entity Mapping Document

## Overview
This document maps the 12 core business primitives of the OmniCore V2 Architecture to Optavel's existing storage structures.

Storage in Optavel follows three primary patterns:
1. **Shared Cross-Vertical Tables**: Core tables used across most verticals (`companies`, `profiles`, `staff_records`, `clients`, `tasks`, `invoices`, `documents`, etc.).
2. **Polymorphic `industry_records` JSON Table**: Flexible per-industry record storage using `industry_type`, `record_type`, and a JSON payload (`data`).
3. **Dedicated Relational Tables**: Specialized tables for specific verticals (e.g., `univ_re_*` for Real Estate, `univ_retail_*` for Retail POS, `univ_pharmacy_*` for Pharmacy, `school_*` / `univ_school_*` for Education, `hospital_*` for Healthcare, `univ_erp_*` for HR/ERP).

---

## Entity Mappings

### 1. Customer
Represents an external individual or organization consuming goods/services.
- **Shared Cross-Vertical Tables**: `clients` (Law/General CRM), `leads` (Sales CRM).
- **Polymorphic `industry_records`**: `record_type = 'member'` / `'donors'` (Religion), `'client'` (Logistics / Insurance / Consulting).
- **Dedicated Relational Tables**:
  - Retail: `univ_retail_customers`, `univ_retail_b2b_accounts`
  - Pharmacy: `univ_pharmacy_customers`
  - Real Estate: `univ_re_clients`
  - Healthcare: `hospital_patients` (or `univ_hospital_patients`)
  - Education: `univ_school_students` / `students` (see Ambiguities)

### 2. Employee
Represents an internal worker or staff member performing work or assigned to tasks.
- **Shared Cross-Vertical Tables**: `staff_records`, `profiles` (User identity & Auth).
- **Polymorphic `industry_records`**: `record_type = 'staff'` / `'agent'`.
- **Dedicated Relational Tables**:
  - Real Estate: `univ_re_agents`
  - HR / ERP: `univ_erp_candidates` (onboarding into `staff_records`)
  - Retail / Pharmacy: `univ_retail_shifts` / `univ_pharmacy_shifts` (maps staff allocations)

### 3. Product
Represents tangible items, goods, inventory, or physical assets sold or managed.
- **Shared Cross-Vertical Tables**: None (product catalog is industry-specific).
- **Polymorphic `industry_records`**: `record_type = 'asset'` / `'item'`.
- **Dedicated Relational Tables**:
  - Retail: `univ_retail_products`, `univ_retail_inventory`
  - Pharmacy: `univ_pharmacy_drugs`, `univ_pharmacy_inventory`
  - Real Estate: `univ_re_properties` (Property asset as product)

### 4. Service
Represents billable or non-billable professional services, work, or activities.
- **Shared Cross-Vertical Tables**: `time_entries` (Billable time/services), `retainers`.
- **Polymorphic `industry_records`**: `record_type = 'service_offering'`.
- **Dedicated Relational Tables**:
  - Legal: `legal_cases` (service engagement), `hearings`
  - Education: `univ_school_courses` / `univ_erp_courses`
  - Healthcare: `hospital_appointments` / `hospital_procedures`

### 5. Supplier
Represents external vendors, contractors, or suppliers providing goods or services to the company.
- **Shared Cross-Vertical Tables**: `expenses` (Vendor association).
- **Polymorphic `industry_records`**: `record_type = 'vendor'` / `'supplier'`.
- **Dedicated Relational Tables**:
  - Retail: `univ_retail_suppliers`, `univ_retail_purchase_orders`
  - Pharmacy: `univ_pharmacy_suppliers`, `univ_pharmacy_purchase_orders`
  - Real Estate: `univ_re_contractors` (Maintenance & Vendor contractors)

### 6. Transaction
Represents financial movement, double-entry journal items, sales, or order exchanges.
- **Shared Cross-Vertical Tables**: `journal_entries`, `accounts`, `expenses`, `retainers`.
- **Polymorphic `industry_records`**: `record_type = 'financial_transaction'`.
- **Dedicated Relational Tables**:
  - Retail: `univ_retail_sales`, `univ_retail_orders`, `univ_retail_returns`
  - Pharmacy: `univ_pharmacy_sales`
  - Real Estate: `univ_re_trust_transactions`, `univ_re_offers`

### 7. Payment
Represents money receipts or disbursements against invoices, accounts, or orders.
- **Shared Cross-Vertical Tables**: `subscription_invoices`, `retainers`.
- **Polymorphic `industry_records`**: `record_type = 'payment_entry'`.
- **Dedicated Relational Tables**:
  - Retail / POS: `univ_retail_sales` (payment tenders: cash, card, mobile)
  - Real Estate: `univ_re_rent_payments`, `univ_re_commission_payouts`

### 8. Invoice
Represents formal billing statements requested for payment.
- **Shared Cross-Vertical Tables**: `invoices`, `subscription_invoices`.
- **Polymorphic `industry_records`**: `record_type = 'invoice'` / `'statement'`.
- **Dedicated Relational Tables**:
  - Pharmacy / Health: `univ_pharmacy_insurance_claims` (Claim invoice)
  - Education: `univ_school_fee_statements`

### 9. Task
Represents actionable units of work, assignments, or action items.
- **Shared Cross-Vertical Tables**: `tasks`, `univ_task_comments`, `univ_task_checklists`, `univ_task_attachments`.
- **Polymorphic `industry_records`**: `record_type = 'action_item'`.
- **Dedicated Relational Tables**:
  - Real Estate: `univ_re_maintenance_requests` (Maintenance task)
  - HR / ERP: `univ_erp_onboarding` (Onboarding tasks)

### 10. Project
Represents larger bounded initiatives containing multiple tasks, cases, or property developments.
- **Shared Cross-Vertical Tables**: `legal_cases` (Legal project engagement), `case_pipelines`.
- **Polymorphic `industry_records`**: `record_type = 'project'` / `'initiative'`.
- **Dedicated Relational Tables**:
  - Real Estate: `univ_re_properties` / `univ_re_developments`

### 11. Document
Represents physical or digital files, contracts, templates, and signature requests.
- **Shared Cross-Vertical Tables**: `documents`, `signature_requests`, `smart_folders`, `smart_doc_links`.
- **Polymorphic `industry_records`**: `record_type = 'document_attachment'`.
- **Dedicated Relational Tables**:
  - Real Estate: `univ_re_document_templates`, `univ_re_e_signatures`
  - Pharmacy: `univ_pharmacy_prescriptions`

### 12. Location
Represents physical branches, store locations, office addresses, or virtual spaces.
- **Primary Branch & Site Tables**:
  - Retail / POS: `univ_retail_branches`, `univ_retail_storefronts`, `univ_retail_warehouse_locations`, `univ_retail_warehouse_bins`
  - Real Estate: `univ_re_properties` (Physical property location)
- **Polymorphic `industry_records`**: `record_type = 'office_branch'` / `'location'`.
- **Shared Fallback**: `companies` (Primary headquarters / company address for single-location tenants).

---

## Ambiguities and Special Cases for Review

1. **Student / Patient Conceptual Role**:
   - In School / University, a `student` pays fees (behaving as a Customer) but also consumes curriculum (behaving as a Participant/Service Subject).
   - In Healthcare, a `patient` receives medical treatment and is billed.
   - *Recommendation*: Map `student` and `patient` to the `Customer` primitive for billing/finance capabilities, while retaining specialized vertical models for clinical/academic operations.

2. **Real Estate Property Asset vs. Product vs. Location**:
   - A real estate property (`univ_re_properties`) acts simultaneously as a **Product/Asset** (when listed for sale/lease), a **Location** (physical address & site), and a **Project** (when undergoing development/renovation).

3. **Legal Case as Project vs. Service**:
   - A `legal_case` in the Law vertical represents both the overall **Project** (with deadlines, tasks, and documents) and the primary **Service** billing unit.

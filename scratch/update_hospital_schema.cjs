const fs = require('fs');

const schemaPath = 'c:/Users/USER/OneDrive/Documents/airflake/src/api/AppSchema.js';
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

const newTables = `
    univ_patient_allergies: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        allergen: column.text,
        reaction: column.text,
        severity: column.text,
        status: column.text}),
    univ_patient_problems: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        problem_name: column.text,
        diagnosis_date: column.text,
        status: column.text,
        notes: column.text}),
    univ_patient_immunizations: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        vaccine_name: column.text,
        administration_date: column.text,
        administered_by: column.text,
        notes: column.text}),
    univ_hospital_referrals: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        referring_provider_id: column.text,
        receiving_department: column.text,
        receiving_provider_id: column.text,
        referral_type: column.text,
        external_facility_name: column.text,
        reason: column.text,
        priority: column.text,
        status: column.text,
        outcome_notes: column.text}),
    univ_hospital_consents: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        procedure_name: column.text,
        consent_type: column.text,
        status: column.text,
        signature_data: column.text,
        signed_by: column.text,
        signed_at: column.text,
        notes: column.text}),
    univ_hospital_queues: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        department: column.text,
        provider_id: column.text,
        status: column.text,
        priority_score: column.text,
        called_at: column.text,
        completed_at: column.text,
        notes: column.text}),
    univ_blood_bank: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        blood_group: column.text,
        unit_number: column.text,
        component_type: column.text,
        collection_date: column.text,
        expiry_date: column.text,
        status: column.text,
        location: column.text}),
    univ_blood_crossmatch: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        blood_unit_id: column.text,
        requested_by: column.text,
        request_date: column.text,
        crossmatch_status: column.text,
        issue_status: column.text,
        notes: column.text}),
    univ_duty_rosters: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        staff_id: column.text,
        department: column.text,
        shift_date: column.text,
        shift_type: column.text,
        start_time: column.text,
        end_time: column.text,
        status: column.text,
        notes: column.text}),
    univ_infection_logs: new Table({
        id: column.text,
        created_at: column.text,
        company_id: column.text,
        patient_id: column.text,
        ward_id: column.text,
        infection_type: column.text,
        organism: column.text,
        source: column.text,
        detection_date: column.text,
        control_measures: column.text,
        status: column.text,
        reported_by: column.text}),
`;

if (!schemaContent.includes('univ_patient_allergies')) {
    schemaContent = schemaContent.replace('    univ_patients: new Table({', newTables + '    univ_patients: new Table({');
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
    console.log('AppSchema updated');
}

const syncPath = 'c:/Users/USER/OneDrive/Documents/airflake/powersync_sync_rules_dynamic.yaml';
let syncContent = fs.readFileSync(syncPath, 'utf8');

const newSyncRules = `
  # -------------------------------------------------------------
  # HOSPITAL COMPREHENSIVE MODULE
  # -------------------------------------------------------------
  - SELECT * FROM univ_patient_allergies WHERE company_id = bucket.company_id
  - SELECT * FROM univ_patient_problems WHERE company_id = bucket.company_id
  - SELECT * FROM univ_patient_immunizations WHERE company_id = bucket.company_id
  - SELECT * FROM univ_hospital_referrals WHERE company_id = bucket.company_id
  - SELECT * FROM univ_hospital_consents WHERE company_id = bucket.company_id
  - SELECT * FROM univ_hospital_queues WHERE company_id = bucket.company_id
  - SELECT * FROM univ_blood_bank WHERE company_id = bucket.company_id
  - SELECT * FROM univ_blood_crossmatch WHERE company_id = bucket.company_id
  - SELECT * FROM univ_duty_rosters WHERE company_id = bucket.company_id
  - SELECT * FROM univ_infection_logs WHERE company_id = bucket.company_id
`;

if (!syncContent.includes('univ_patient_allergies')) {
    fs.appendFileSync(syncPath, newSyncRules, 'utf8');
    console.log('PowerSync updated');
}

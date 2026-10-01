-- Powersync definitions for law firm tables
DROP PUBLICATION IF EXISTS powersync_law_data;
CREATE PUBLICATION powersync_law_data FOR TABLE
    time_entries,
    trust_accounts,
    trust_transactions,
    client_portal_access,
    client_portal_uploads,
    document_templates,
    generated_documents,
    intake_forms,
    intake_submissions,
    conflict_check_results,
    court_hearings;

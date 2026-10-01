import { powerSync } from "@/api/PowerSyncConnector";

export const ActivityLogger = {
  /**
   * Logs a user action into the system_activity_logs offline-first table.
   * 
   * @param {Object} params
   * @param {string} params.companyId - The company ID.
   * @param {string} params.userEmail - Email of the user performing the action.
   * @param {string} params.userName - Name of the user performing the action.
   * @param {string} params.action - Description of the action (e.g., "Created Record", "Updated Invoice").
   * @param {string} params.module - The name of the module/component (e.g., "Orbit Dashboard", "CRM").
   * @param {string} params.slate - The specific slate/industry context.
   * @param {Object} [params.details] - Optional JSON details about the action.
   */
  async log({ companyId, userEmail, userName, action, module = 'System', slate = 'Global', details = {} }) {
    try {
      if (!companyId) return;

      const payload = {
        id: crypto.randomUUID(),
        company_id: companyId,
        rule_id: null,
        status: 'logged',
        user_email: userEmail || 'System',
        user_name: userName || 'System',
        action,
        module,
        slate,
        ip_address: 'Logged via App',
        details: JSON.stringify(details),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const keys = Object.keys(payload);
      const values = Object.values(payload);

      await powerSync.execute(
        `INSERT INTO automation_logs (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        values
      );
    } catch (err) {
      console.warn("Failed to log activity:", err);
    }
  }
};

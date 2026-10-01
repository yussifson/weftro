import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompanyId, useCompany } from "@/hooks/useCompanyId";
import { useAuth } from "@/lib/AuthContext";

const DEFAULT_CASE_TYPES = ["civil", "criminal", "corporate", "family", "property", "labor", "tax", "other"];
const DEFAULT_CASE_STATUSES = ["open", "in_progress", "pending_hearing", "closed", "archived"];
const DEFAULT_TASK_TYPES = ["legal", "admin", "finance", "hr", "other"];
const DEFAULT_DOC_CATEGORIES = ["pleading", "contract", "evidence", "correspondence", "court_order", "invoice", "id_document", "other"];

const DEFAULT_LAW_ROLES = ["company_admin", "lawyer", "paralegal", "hr", "finance", "support"];
const DEFAULT_RETAIL_ROLES = ["store_manager", "cashier", "inventory_clerk", "sales_associate", "support"];

export function useFirmSettings() {
  const companyId = useCompanyId();
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const override = typeof window !== 'undefined' ? sessionStorage.getItem('slate_industry_override') : null;
  const industry = override || company?.industry_type || user?.company_industry || 'law';
  const isRetail = industry === 'retail_sale' || industry === 'retail';

  const { data: settingsArr = [] } = useQuery({
    queryKey: ["firm-settings", companyId],
    queryFn: () => base44.entities.FirmSettings.filter({ company_id: companyId }),
    enabled: !!companyId});

  const settings = settingsArr[0] || null;

  const updateMutation = useMutation({
    mutationFn: async (patch) => {
      if (settings?.id) {
        return base44.entities.FirmSettings.update(settings.id, patch);
      } else {
        return base44.entities.FirmSettings.create({ company_id: companyId, ...patch });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["firm-settings", companyId] })});

  const caseTypes = [...DEFAULT_CASE_TYPES, ...(settings?.custom_case_types || [])];
  const caseStatuses = [...DEFAULT_CASE_STATUSES, ...(settings?.custom_case_statuses || [])];
  const taskTypes = [...DEFAULT_TASK_TYPES, ...(settings?.custom_task_types || [])];
  const docCategories = [...DEFAULT_DOC_CATEGORIES, ...(settings?.custom_document_categories || [])];
  
  const baseRoles = isRetail ? DEFAULT_RETAIL_ROLES : DEFAULT_LAW_ROLES;
  const roles = [...baseRoles, ...(settings?.custom_roles || [])];

  const addCaseType = (val) => updateMutation.mutate({ custom_case_types: [...(settings?.custom_case_types || []), val] });
  const addCaseStatus = (val) => updateMutation.mutate({ custom_case_statuses: [...(settings?.custom_case_statuses || []), val] });
  const addTaskType = (val) => updateMutation.mutate({ custom_task_types: [...(settings?.custom_task_types || []), val] });
  const addDocCategory = (val) => updateMutation.mutate({ custom_document_categories: [...(settings?.custom_document_categories || []), val] });
  const addRole = (val) => updateMutation.mutate({ custom_roles: [...(settings?.custom_roles || []), val] });

  return { caseTypes, caseStatuses, taskTypes, docCategories, roles, addCaseType, addCaseStatus, addTaskType, addDocCategory, addRole };
}
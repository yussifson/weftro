export const SUBSCRIPTION_PLANS = {
  free_trial: { name: "Free Trial", price: 0, maxUsers: 10, maxCases: 10, maxStorageGB: 1, maxClients: 20, maxIndustries: 1, aiLimited: true },
  starter: { name: "Starter", price: 49, maxUsers: 10, maxCases: 50, maxStorageGB: 5, maxClients: 50, maxIndustries: 1, aiLimited: true },
  professional: { name: "Professional", price: 149, maxUsers: 15, maxCases: 500, maxStorageGB: 50, maxClients: 500, maxIndustries: 99, aiLimited: false },
  enterprise: { name: "Enterprise", price: 499, maxUsers: 9999, maxCases: 9999, maxStorageGB: 500, maxClients: 9999, maxIndustries: 99, aiLimited: false },
  off_cloud: { name: "Off-Cloud", price: "Custom", maxUsers: "Unlimited", isContactSales: true }
};

export const CURRENCIES = {
  GHS: { symbol: "GH₵", name: "Ghanaian Cedi" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  SLL: { symbol: "Le", name: "Sierra Leonean Leone" },
  USD: { symbol: "$", name: "US Dollar" }
};

export const CASE_STATUS_COLORS = {
  open: "bg-orange-100 text-orange-700",
  in_progress: "bg-amber-100 text-amber-700",
  pending_hearing: "bg-primary/10 text-primary",
  closed: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-[#71717a] dark:text-gray-400"
};

export const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-emerald-100 text-emerald-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600"
};

export const INVOICE_STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-emerald-100 text-emerald-600",
  paid: "bg-green-100 text-green-600",
  overdue: "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-[#71717a] dark:text-gray-400"
};

export const TASK_STATUS_COLORS = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-emerald-100 text-emerald-600",
  completed: "bg-green-100 text-green-600",
  cancelled: "bg-gray-100 text-[#71717a] dark:text-gray-400"
};

export const isSuperAdmin = (user) => user?.role === 'super_admin' || user?.user_metadata?.role === 'super_admin';
export const isCompanyAdmin = (user) => user?.role === "company_admin";
export const isAdmin = (user) => ["super_admin", "admin", "company_admin"].includes(user?.role);
export const isSpaceman = (user) => user?.role === 'spaceman';
export const isDeveloper = (user) => user?.role === 'developer';
export const canAccessDeveloperPlatform = (user) => isAdmin(user) || isDeveloper(user);
// isSpacemanInSpace: true if user is a Spaceman AND is a member of this space
// Spaceman rights are scoped to spaces they have been explicitly added to.
export const isSpacemanInSpace = (user, spaceMembers) => {
  if (!user || !spaceMembers) return false;
  if (!isSpaceman(user)) return false;
  return spaceMembers.some(m => m.user_id === user.id);
};
export const canCreateSpaces = (user) => isAdmin(user) || isSpaceman(user);
export const isLawyer = (user) => ["lawyer", "paralegal"].includes(user?.role);

// Retail Role Helpers
export const isRetailAdmin = (user) => ["super_admin", "company_admin", "store_manager"].includes(user?.role);
export const isRetailCashier = (user) => user?.role === "cashier";
export const isRetailInventoryManager = (user) => ["super_admin", "company_admin", "store_manager", "inventory_clerk"].includes(user?.role);

export const formatCurrency = (amount, currency = "GHS") => {
  const curr = CURRENCIES[currency] || CURRENCIES.GHS;
  return `${curr.symbol}${(amount || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
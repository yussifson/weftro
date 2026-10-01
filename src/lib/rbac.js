/**
 * Granular Role-Based Access Control (RBAC) Engine
 */

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  COMPANY_ADMIN: "company_admin",
  MANAGING_PARTNER: "managing_partner",
  MANAGER: "manager",
  USER: "user",
  GUEST: "guest",
  CEO: "CEO",
  FOUNDER: "Founder",
  ADMIN: "admin",
  OWNER: "owner",
  LAWYER: "lawyer",
  EMPLOYEE: "employee",
  SPACEMAN: "spaceman"
};

// Define default permissions matrix for each role across modules
// Permissions: create, read, update, delete
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    all: ["create", "read", "update", "delete"] // Implicit all access
  },
  [ROLES.SPACEMAN]: {
    all: ["create", "read", "update", "delete"]
  },
  [ROLES.COMPANY_ADMIN]: {
    all: ["create", "read", "update", "delete"]
  },
  [ROLES.MANAGING_PARTNER]: {
    all: ["create", "read", "update", "delete"]
  },
  [ROLES.CEO]: {
    all: ["create", "read", "update", "delete"]
  },
  [ROLES.FOUNDER]: {
    all: ["create", "read", "update", "delete"]
  },
  [ROLES.ADMIN]: {
    all: ["create", "read", "update", "delete"]
  },
  [ROLES.OWNER]: {
    all: ["create", "read", "update", "delete"]
  },
  [ROLES.MANAGER]: {
    cases: ["create", "read", "update"],
    clients: ["create", "read", "update"],
    documents: ["create", "read", "update", "delete"],
    billing: ["create", "read", "update"],
    sales: ["create", "read", "update"],
    finance: ["create", "read", "update"],
    business_health: ["read"],
    action_center: ["create", "read", "update"],
    intelligence: ["read"],
    team: ["create", "read", "update"],
    settings: ["read"]
  },
  [ROLES.LAWYER]: {
    cases: ["create", "read", "update"],
    clients: ["create", "read", "update"],
    documents: ["create", "read", "update", "delete"],
    billing: ["create", "read", "update"],
    sales: ["create", "read", "update"],
    finance: ["create", "read", "update"],
    business_health: ["read"],
    action_center: ["create", "read", "update"],
    intelligence: ["read"],
    team: ["read"],
    settings: ["read"]
  },
  [ROLES.USER]: {
    cases: ["read", "update"],
    clients: ["read", "update"],
    documents: ["create", "read", "update"], // Users generally can't delete globally
    billing: ["read"],
    sales: ["read"],
    finance: ["read"],
    business_health: ["read"],
    action_center: ["read"],
    intelligence: ["read"],
    team: ["read"],
    settings: []
  },
  [ROLES.GUEST]: {
    cases: ["read"],
    clients: [],
    documents: ["read"],
    billing: [],
    sales: [],
    finance: [],
    business_health: [],
    action_center: [],
    intelligence: [],
    team: [],
    settings: []
  },
  [ROLES.EMPLOYEE]: {
    cases: ["read", "update"],
    clients: ["read", "update"],
    documents: ["create", "read", "update"],
    billing: ["read"],
    sales: ["read"],
    finance: ["read"],
    business_health: ["read"],
    action_center: ["read"],
    intelligence: ["read"],
    team: ["read"],
    settings: []
  }
};

/**
 * Check if a user role has permission to perform an action on a module
 * @param {string} role - The user's role (e.g., 'user', 'manager')
 * @param {string} module - The module name (e.g., 'documents', 'cases')
 * @param {string} action - The action to perform ('create', 'read', 'update', 'delete')
 * @returns {boolean} True if permitted, false otherwise
 */
export function hasPermission(role, module, action) {
  // If role is undefined or not in our matrix, grant basic permissions for safety in this version
  // or check if it matches an admin string
  if (!role) return false;
  
  const roleKey = Object.keys(ROLES).find(key => ROLES[key].toLowerCase() === role.toLowerCase()) || role;
  
  let permissions = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    if (['admin', 'ceo', 'founder', 'director', 'owner', 'spaceman'].some(r => role.toLowerCase().includes(r))) {
      permissions = { all: ["create", "read", "update", "delete"] };
    } else {
      permissions = ROLE_PERMISSIONS[ROLES.USER]; // Default to USER permissions if unknown
    }
  }
  
  // Super admins/admins have 'all' wildcard access
  if (permissions.all && permissions.all.includes(action)) {
    return true;
  }
  
  // Check specific module
  const modulePerms = permissions[module] || [];
  return modulePerms.includes(action);
}

/**
 * Higher order function to enforce RBAC in API layers or Components
 */
export function enforcePermission(role, module, action) {
  if (!hasPermission(role, module, action)) {
    throw new Error(`RBAC Error: Role '${role}' does not have permission to '${action}' on module '${module}'.`);
  }
}

export const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
};

// Permissões organizadas por funcionalidade (FR-003): novos papéis (ex.: "operator")
// entram aqui com um subconjunto de capacidades, sem reescrever o controle de acesso.
export const PERMISSIONS = {
  [ROLES.ADMIN]: [
    "dashboard.view",
    "products.read",
    "products.write",
    "categories.read",
    "categories.write",
    "orders.read",
    "orders.updateStatus",
    "customers.read",
    "reports.read",
    "reports.export",
  ],
  [ROLES.CUSTOMER]: [],
};

export function roleHasPermission(role, capability) {
  return (PERMISSIONS[role] || []).includes(capability);
}

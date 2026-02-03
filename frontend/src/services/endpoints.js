const v1 = "/api/v1";
const v1Admin = "/api/v1/admin";
export const endpoints = {
  auth: {
    login: `${v1}/auth/login`,
    googleLogin: `${v1}/auth/google-login`,
    refresh: `${v1}/auth/refresh-token`,
    me: `${v1}/auth/me`,
    register: `${v1}/auth/register`,
    logout: `${v1}/auth/logout`,
    forgotPassword: `${v1}/auth/forgot-password`,
    resetPassword: `${v1}/auth/reset-password`,
  },
  users: {
    getAll: `${v1Admin}/user`,
    create: `${v1Admin}/user`,
    update: (id) => `${v1Admin}/user/${id}`,
    remove: (id) => `${v1Admin}/user/${id}`,
    restore: (id) => `${v1Admin}/user/${id}/restore`,
    bulkSetStatus: `${v1Admin}/user/bulk/status`,
    bulkSoftDelete: `${v1Admin}/user/bulk/delete`,
    getAssignableRoles: `${v1Admin}/user/assignable-roles`,

  },

  categories: {
    list: `${v1Admin}/category`,              // GET
    create: `${v1Admin}/category/create`,     // POST
    detail: (id) => `${v1Admin}/category/${id}`,
    update: (id) => `${v1Admin}/category/${id}`, // PATCH

    // soft delete -> vào thùng rác
    remove: (id) => `${v1Admin}/category/${id}`, // DELETE
    getForProduct: `${v1Admin}/category/product/for-product`,
    // restore từ thùng rác
    restore: (id) => `${v1Admin}/category/${id}/restore`, // PATCH

    // hard delete (xóa vĩnh viễn) - chỉ khi isDeleted=true
    hardDelete: (id) => `${v1Admin}/category/${id}/hard`,  // DELETE
  },

  products: {
    listCategory: `${v1Admin}/product/list-category`,
    list: `${v1Admin}/product`,
    create: `${v1Admin}/product`,
    detail: (id) => `${v1Admin}/product/${id}`,
    update: (id) => `${v1Admin}/product/update/${id}`,
    delete: (id) => `${v1Admin}/product/delete/${id}`,
    changeStatus: (id) => `${v1Admin}/product/${id}/status`,
  },

  template: {
    getTemplates: `${v1Admin}/templates`,
    createTemplate: `${v1Admin}/templates/create`,
    detailTemplate: (type) => `${v1Admin}/templates/details/${type}`,
    createTemplateVersion: (type) => `${v1Admin}/templates/${type}/version`,
    activateTemplateVersion: (type, version) => `${v1Admin}/templates/${type}/activate/${version}`,
    updateTemplateVersion: (type, version) => `${v1Admin}/templates/${type}/version/${version}`,
    getTemplateVersion: (type, version) => `${v1Admin}/templates/${type}/version/${version}`,
    productDescriptionTemplateApi: `${v1Admin}/templates/product-description-templates`
  },
  rbac: {
    roles: `${v1Admin}/rbac/roles`,
    permissions: `${v1Admin}/rbac/permissions`,
    syncAdmin: `${v1Admin}/rbac/sync-admin`,
    setRolePermissions: `${v1Admin}/rbac/role-permissions`,
    setUserRoles: `${v1Admin}/rbac/user-roles`,
    setUserOverride: `${v1Admin}/rbac/user-override`,
    removeUserOverride: `${v1Admin}/rbac/user-override`,
    catalog: `${v1Admin}/rbac/catalog`,

    createRole: `${v1Admin}/rbac/roles/create`,
    updateRole: (id) => `${v1Admin}/rbac/roles/update/${id}`,
    // ROLES
    getPermissionByRole: ({ roleCode }) =>
      `${v1Admin}/rbac/roles/${encodeURIComponent(roleCode)}/permissions`,

    roleById: (id) => `${v1Admin}/rbac/roles/${encodeURIComponent(id)}`,

    rolesStatus: ({ id }) => `${v1Admin}/rbac/roles/${id}/status`,
  },
  orders: {
    // USER (me)
    me: `${v1}/order/me`,
    meDetail: (id) => `${v1}/order/me/${id}`,
    meCreate: `${v1}/order/me/create`,
    meCancel: (id) => `${v1}/order/me/${id}/cancel`,

    // ADMIN
    adminAll: `${v1Admin}/order/all`,
    adminUpdateStatus: (id) => `${v1Admin}/order/update-status/${id}`,

    // STAFF
    staffUnassigned: `${v1}/staff/order/unassigned`, // GET ?status=Pending
    staffClaim: (id) => `${v1}/staff/order/${id}/claim`, // PATCH
    staffMyOrders: `${v1}/staff/order`, // GET ?status=&month=

    // SHIPPER ✅ thêm
    shipperInbox: `${v1}/shipper/order/inbox`,                 // GET
    shipperClaim: (id) => `${v1}/shipper/order/claim/${id}`,   // POST

    // DASHBOARD
    dashboardMonth: `${v1}/dashboard/order/month`, // GET ?month=YYYY-MM&compare=1&staffId=
  },


  audit: {
    ProductHistory: (id) => `${v1Admin}/audit/product/${id}/history`,
    getProductAuditList: `${v1Admin}/audit/product`,
    getSecurityAuditList: `${v1Admin}/audit/security`,
    getProductAuditDetail: (auditId) => `${v1Admin}/audit/products/${auditId}`,
  },

  payments: {
  // ADMIN
  adminList: `${v1Admin}/payments`,   // GET /api/v1/admin/payments

  // USER
  my: `${v1}/payments/my`,            // GET /api/v1/payments/my
  },

  upload: {
    signature: `${v1Admin}/upload/signature`,
    feedbackSignature: `${v1}/upload/feedback-signature`,
  },
  chat: {
    send: `${v1}/chat`,
  },
};

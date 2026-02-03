// src/constants/rbac.catalog.js
// - Dùng để:
//   1) Seed Permission vào DB (từ PERMISSION_META_LIST)
//   2) UI build menu/screen + map route/action -> permission
//   3) Guard/authorize theo permission key

const {
    PERMISSION_GROUPS
} = require("./permission.groups");
//
// Gợi ý seed DB: upsert Permission theo permissionMetaList bên dưới.


// =====================================================
// 1) PERMISSIONS: keys chuẩn để guard backend & FE check
// =====================================================
const BASE_PERMISSIONS = Object.freeze({
    // ===== ADMIN =====
    RBAC_MANAGE: "rbac:manage",

    // ===== USERS =====
    USER_READ: "user:read",
    USER_CREATE: "user:create",
    USER_UPDATE: "user:update",
    USER_DELETE: "user:delete",
    USER_CHANGE_STATUS: "user:status",
    USER_BULK_STATUS: "user:bulk_status",
    USER_BULK_DELETE: "user:bulk_delete",
    USER_UPLOAD_AVATAR: "user:upload_avatar",
    USER_SET_ROLES: "user:set_roles",

    // ===== CATEGORIES =====
    CATEGORY_READ: "category:read",
    CATEGORY_CREATE: "category:create",
    CATEGORY_UPDATE: "category:update",
    CATEGORY_DELETE: "category:delete",
    CATEGORY_CHANGE_STATUS: "category:status",

    // ===== PRODUCTS =====
    PRODUCT_READ: "product:read",
    PRODUCT_CREATE: "product:create",
    PRODUCT_UPDATE: "product:update",
    PRODUCT_DELETE: "product:delete",
    PRODUCT_CHANGE_STATUS: "product:status",

    // ===== ORDERS =====
    ORDER_READ: "order:read",
    ORDER_CREATE: "order:create",
    ORDER_UPDATE: "order:update",
    ORDER_DELETE: "order:delete",
    ORDER_UPDATE_STATUS: "order:status",

    // DASHBOARD
    ORDER_DASHBOARD_READ: "order:dashboard_read",
    ORDER_DASHBOARD_REBUILD: "order:dashboard_rebuild",

    // ===== ORDERS (STAFF) =====
    ORDER_STAFF_INBOX_READ: "order:inbox_read", // xem inbox đơn chưa gán
    ORDER_STAFF_MY_READ: "order:mine_read", // xem đơn của tôi
    ORDER_STAFF_CLAIM: "order:claim", // claim đơn

    // ===== ORDERS (SHIPPER) =====
    ORDER_SHIPPER_INBOX_READ: "order:shipper_inbox_read", // shipper xem inbox đơn confirmed chưa có shipper
    ORDER_SHIPPER_CLAIM: "order:shipper_claim", // shipper nhận đơn (Confirmed -> Shipped)
    ORDER_SHIPPER_MY_READ: "order:shipper_my_read", // ✅ THÊM
    ORDER_SHIPPER_DELIVER: "order:shipper_deliver", // ✅ THÊM
    ORDER_SHIPPER_CANCEL: "order:shipper_cancel", // ✅ THÊM

    // ===== RBAC / SYSTEM =====
    RBAC_READ: "rbac:read",
    RBAC_CREATE_ROLE: "rbac:role_create",
    RBAC_UPDATE_ROLE: "rbac:role_update",
    RBAC_DELETE_ROLE: "rbac:role_delete",

    RBAC_READ_PERMISSION: "rbac:permission_read",
    RBAC_CREATE_PERMISSION: "rbac:permission_create",
    RBAC_UPDATE_PERMISSION: "rbac:permission_update",
    RBAC_DELETE_PERMISSION: "rbac:permission_delete",

    RBAC_SET_ROLE_PERMISSIONS: "rbac:set_role_permissions",
    RBAC_SET_USER_ROLES: "rbac:set_user_roles",
    RBAC_SET_USER_OVERRIDE: "rbac:set_user_override",
    RBAC_REMOVE_USER_OVERRIDE: "rbac:remove_user_override",

    RBAC_SYNC_ADMIN: "rbac:sync_admin",

    // Template – basic
    TEMPLATE_READ: "template:read",
    TEMPLATE_CREATE: "template:create",
    TEMPLATE_UPDATE: "template:update",

    // Template – versioning
    TEMPLATE_CREATE_VERSION: "template:create_version",
    TEMPLATE_ACTIVATE_VERSION: "template:activate_version",

    // (tuỳ chọn – khuyến nghị)
    TEMPLATE_CHANGE_STATUS: "template:status",


    // ===== AUDIT =====
    AUDIT_READ: "audit:read",
    AUDIT_PRODUCT_READ: "audit:product:read",
    AUDIT_PRODUCT_ROLLBACK: "audit:product:rollback",
    AUDIT_SECURITY_READ: "audit:security:read",
    AUDIT_PAYMENT_READ: "audit:payment:read",

});

//merge Audit perms vào PERMISSIONS
const PERMISSIONS = Object.freeze({
    ...BASE_PERMISSIONS,
});

// =====================================================
// 2) PERMISSION_META: tiếng Việt + group + order -> seed DB
// =====================================================
const BASE_PERMISSION_META = Object.freeze({
    // ===== USERS =====
    [PERMISSIONS.USER_READ]: {
        key: PERMISSIONS.USER_READ,
        resource: "user",
        action: "read",
        label: "Xem danh sách / chi tiết người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 10,
    },
    [PERMISSIONS.USER_CREATE]: {
        key: PERMISSIONS.USER_CREATE,
        resource: "user",
        action: "create",
        label: "Thêm người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 20,
    },
    [PERMISSIONS.USER_UPDATE]: {
        key: PERMISSIONS.USER_UPDATE,
        resource: "user",
        action: "update",
        label: "Sửa thông tin người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 30,
    },
    [PERMISSIONS.USER_DELETE]: {
        key: PERMISSIONS.USER_DELETE,
        resource: "user",
        action: "delete",
        label: "Xóa người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 40,
    },
    [PERMISSIONS.USER_CHANGE_STATUS]: {
        key: PERMISSIONS.USER_CHANGE_STATUS,
        resource: "user",
        action: "status",
        label: "Bật / tắt trạng thái người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 50,
    },
    [PERMISSIONS.USER_BULK_STATUS]: {
        key: PERMISSIONS.USER_BULK_STATUS,
        resource: "user",
        action: "bulk_status",
        label: "Cập nhật trạng thái hàng loạt người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 60,
    },
    [PERMISSIONS.USER_BULK_DELETE]: {
        key: PERMISSIONS.USER_BULK_DELETE,
        resource: "user",
        action: "bulk_delete",
        label: "Xóa hàng loạt người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 70,
    },
    [PERMISSIONS.USER_UPLOAD_AVATAR]: {
        key: PERMISSIONS.USER_UPLOAD_AVATAR,
        resource: "user",
        action: "upload_avatar",
        label: "Cập nhật ảnh đại diện người dùng",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 80,
    },
    [PERMISSIONS.USER_SET_ROLES]: {
        key: PERMISSIONS.USER_SET_ROLES,
        resource: "user",
        action: "set_roles",
        label: "Gán role cho user",
        groupKey: PERMISSION_GROUPS.USERS.key,
        groupLabel: PERMISSION_GROUPS.USERS.label,
        order: 85,
    },

    // ===== CATEGORIES =====
    [PERMISSIONS.CATEGORY_READ]: {
        key: PERMISSIONS.CATEGORY_READ,
        resource: "category",
        action: "read",
        label: "Xem danh mục",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 110,
    },
    [PERMISSIONS.CATEGORY_CREATE]: {
        key: PERMISSIONS.CATEGORY_CREATE,
        resource: "category",
        action: "create",
        label: "Thêm danh mục",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 120,
    },
    [PERMISSIONS.CATEGORY_UPDATE]: {
        key: PERMISSIONS.CATEGORY_UPDATE,
        resource: "category",
        action: "update",
        label: "Sửa danh mục",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 130,
    },
    [PERMISSIONS.CATEGORY_DELETE]: {
        key: PERMISSIONS.CATEGORY_DELETE,
        resource: "category",
        action: "delete",
        label: "Xóa danh mục",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 140,
    },
    [PERMISSIONS.CATEGORY_CHANGE_STATUS]: {
        key: PERMISSIONS.CATEGORY_CHANGE_STATUS,
        resource: "category",
        action: "status",
        label: "Bật / tắt trạng thái danh mục",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 150,
    },

    // ===== PRODUCTS =====
    [PERMISSIONS.PRODUCT_READ]: {
        key: PERMISSIONS.PRODUCT_READ,
        resource: "product",
        action: "read",
        label: "Xem sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 210,
    },
    [PERMISSIONS.PRODUCT_CREATE]: {
        key: PERMISSIONS.PRODUCT_CREATE,
        resource: "product",
        action: "create",
        label: "Thêm sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 220,
    },
    [PERMISSIONS.PRODUCT_UPDATE]: {
        key: PERMISSIONS.PRODUCT_UPDATE,
        resource: "product",
        action: "update",
        label: "Sửa sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 230,
    },
    [PERMISSIONS.PRODUCT_DELETE]: {
        key: PERMISSIONS.PRODUCT_DELETE,
        resource: "product",
        action: "delete",
        label: "Xóa sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 240,
    },
    [PERMISSIONS.PRODUCT_CHANGE_STATUS]: {
        key: PERMISSIONS.PRODUCT_CHANGE_STATUS,
        resource: "product",
        action: "status",
        label: "Bật / tắt trạng thái sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 250,
    },
    [PERMISSIONS.AUDIT_PRODUCT_READ]: {
        key: PERMISSIONS.AUDIT_PRODUCT_READ,
        resource: "audit",
        action: "product_read",
        label: "Xem lịch sử thay đổi sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 260,
    },

    // ===== PRODUCT DESCRIPTION TEMPLATE =====
    [PERMISSIONS.TEMPLATE_READ]: {
        key: PERMISSIONS.TEMPLATE_READ,
        resource: "product_template",
        action: "read",
        label: "Xem mẫu mô tả sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 300,
    },

    [PERMISSIONS.TEMPLATE_CREATE]: {
        key: PERMISSIONS.TEMPLATE_CREATE,
        resource: "product_template",
        action: "create",
        label: "Tạo mẫu mô tả sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 310,
    },

    [PERMISSIONS.TEMPLATE_UPDATE]: {
        key: PERMISSIONS.TEMPLATE_UPDATE,
        resource: "product_template",
        action: "update",
        label: "Chỉnh sửa mẫu mô tả sản phẩm",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 320,
    },

    [PERMISSIONS.TEMPLATE_CREATE_VERSION]: {
        key: PERMISSIONS.TEMPLATE_CREATE_VERSION,
        resource: "product_template",
        action: "create_version",
        label: "Tạo phiên bản mô tả mới",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 330,
    },

    [PERMISSIONS.TEMPLATE_ACTIVATE_VERSION]: {
        key: PERMISSIONS.TEMPLATE_ACTIVATE_VERSION,
        resource: "product_template",
        action: "activate_version",
        label: "Kích hoạt phiên bản mô tả",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 340,
    },

    [PERMISSIONS.TEMPLATE_CHANGE_STATUS]: {
        key: PERMISSIONS.TEMPLATE_CHANGE_STATUS,
        resource: "product_template",
        action: "status",
        label: "Bật / tắt mẫu mô tả",
        groupKey: PERMISSION_GROUPS.CATALOG.key,
        groupLabel: PERMISSION_GROUPS.CATALOG.label,
        order: 350,
    },

    // ===== ORDERS =====
    [PERMISSIONS.ORDER_READ]: {
        key: PERMISSIONS.ORDER_READ,
        resource: "order",
        action: "read",
        label: "Xem đơn hàng",
        groupKey: PERMISSION_GROUPS.ORDERS.key,
        groupLabel: PERMISSION_GROUPS.ORDERS.label,
        order: 310,
    },
    [PERMISSIONS.ORDER_CREATE]: {
        key: PERMISSIONS.ORDER_CREATE,
        resource: "order",
        action: "create",
        label: "Tạo đơn hàng",
        groupKey: PERMISSION_GROUPS.ORDERS.key,
        groupLabel: PERMISSION_GROUPS.ORDERS.label,
        order: 320,
    },
    [PERMISSIONS.ORDER_UPDATE]: {
        key: PERMISSIONS.ORDER_UPDATE,
        resource: "order",
        action: "update",
        label: "Sửa đơn hàng",
        groupKey: PERMISSION_GROUPS.ORDERS.key,
        groupLabel: PERMISSION_GROUPS.ORDERS.label,
        order: 330,
    },
    [PERMISSIONS.ORDER_DELETE]: {
        key: PERMISSIONS.ORDER_DELETE,
        resource: "order",
        action: "delete",
        label: "Xóa đơn hàng",
        groupKey: PERMISSION_GROUPS.ORDERS.key,
        groupLabel: PERMISSION_GROUPS.ORDERS.label,
        order: 340,
    },
    [PERMISSIONS.ORDER_UPDATE_STATUS]: {
        key: PERMISSIONS.ORDER_UPDATE_STATUS,
        resource: "order",
        action: "status",
        label: "Cập nhật trạng thái đơn hàng",
        groupKey: PERMISSION_GROUPS.ORDERS.key,
        groupLabel: PERMISSION_GROUPS.ORDERS.label,
        order: 350,
    },

    // ===== DASHBOARH =====
    [PERMISSIONS.ORDER_DASHBOARD_READ]: {
        key: PERMISSIONS.ORDER_DASHBOARD_READ,
        resource: "order",
        action: "dashboard_read",
        label: "Xem dashboard đơn hàng",
        groupKey: PERMISSION_GROUPS.ORDERS.key,
        groupLabel: PERMISSION_GROUPS.ORDERS.label,
        order: 305, // bạn chọn số nào cũng được, miễn không trùng
    },

    [PERMISSIONS.ORDER_DASHBOARD_REBUILD]: {           // ✅ thêm block này
        key: PERMISSIONS.ORDER_DASHBOARD_REBUILD,
        resource: "order",
        action: "dashboard_rebuild",
        label: "Rebuild dashboard (xoá cache & replay đơn)",
        groupKey: PERMISSION_GROUPS.ORDERS.key,
        groupLabel: PERMISSION_GROUPS.ORDERS.label,
        order: 306,
    },

    // ===== STAFF =====
    [PERMISSIONS.ORDER_STAFF_INBOX_READ]: {
        key: PERMISSIONS.ORDER_STAFF_INBOX_READ,
        resource: "order",
        action: "inbox_read",
        label: "STAFF: Xem inbox đơn chưa gán",
        groupKey: PERMISSION_GROUPS.STAFF.key,
        groupLabel: PERMISSION_GROUPS.STAFF.label,
        order: 360,
    },
    [PERMISSIONS.ORDER_STAFF_MY_READ]: {
        key: PERMISSIONS.ORDER_STAFF_MY_READ,
        resource: "order",
        action: "mine_read",
        label: "STAFF: Xem đơn của tôi",
        groupKey: PERMISSION_GROUPS.STAFF.key,
        groupLabel: PERMISSION_GROUPS.STAFF.label,
        order: 370,
    },
    [PERMISSIONS.ORDER_STAFF_CLAIM]: {
        key: PERMISSIONS.ORDER_STAFF_CLAIM,
        resource: "order",
        action: "claim",
        label: "STAFF: Nhận (claim) đơn",
        groupKey: PERMISSION_GROUPS.STAFF.key,
        groupLabel: PERMISSION_GROUPS.STAFF.label,
        order: 380,
    },

    // ===== SHIPPER =====
    [PERMISSIONS.ORDER_SHIPPER_INBOX_READ]: {
        key: PERMISSIONS.ORDER_SHIPPER_INBOX_READ,
        resource: "order",
        action: "shipper_inbox_read",
        label: "SHIPPER: Xem inbox đơn chờ giao",
        groupKey: PERMISSION_GROUPS.SHIPPER.key,
        groupLabel: PERMISSION_GROUPS.SHIPPER.label,
        order: 390,
    },

    [PERMISSIONS.ORDER_SHIPPER_CLAIM]: {
        key: PERMISSIONS.ORDER_SHIPPER_CLAIM,
        resource: "order",
        action: "shipper_claim",
        label: "SHIPPER: Nhận đơn giao (claim)",
        groupKey: PERMISSION_GROUPS.SHIPPER.key,
        groupLabel: PERMISSION_GROUPS.SHIPPER.label,
        order: 395,
    },

    [PERMISSIONS.ORDER_SHIPPER_MY_READ]: {
        key: PERMISSIONS.ORDER_SHIPPER_MY_READ,
        resource: "order",
        action: "shipper_my_read",
        label: "SHIPPER: Xem đơn tôi đang giao",
        groupKey: PERMISSION_GROUPS.SHIPPER.key,
        groupLabel: PERMISSION_GROUPS.SHIPPER.label,
        order: 398,
    },

    [PERMISSIONS.ORDER_SHIPPER_DELIVER]: {
        key: PERMISSIONS.ORDER_SHIPPER_DELIVER,
        resource: "order",
        action: "shipper_deliver",
        label: "SHIPPER: Xác nhận đã giao",
        groupKey: PERMISSION_GROUPS.SHIPPER.key,
        groupLabel: PERMISSION_GROUPS.SHIPPER.label,
        order: 399,
    },

    [PERMISSIONS.ORDER_SHIPPER_CANCEL]: {
        key: PERMISSIONS.ORDER_SHIPPER_CANCEL,
        resource: "order",
        action: "shipper_cancel",
        label: "SHIPPER: Hủy đơn đang giao",
        groupKey: PERMISSION_GROUPS.SHIPPER.key,
        groupLabel: PERMISSION_GROUPS.SHIPPER.label,
        order: 400,
    },


    // ===== RBAC / SYSTEM =====
    [PERMISSIONS.RBAC_READ]: {
        key: PERMISSIONS.RBAC_READ,
        resource: "rbac",
        action: "read",
        label: "Xem module phân quyền (RBAC)",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 900,
    },
    [PERMISSIONS.RBAC_CREATE_ROLE]: {
        key: PERMISSIONS.RBAC_CREATE_ROLE,
        resource: "rbac",
        action: "role_create",
        label: "Tạo role",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 910,
    },
    [PERMISSIONS.RBAC_UPDATE_ROLE]: {
        key: PERMISSIONS.RBAC_UPDATE_ROLE,
        resource: "rbac",
        action: "role_update",
        label: "Sửa role",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 920,
    },
    [PERMISSIONS.RBAC_DELETE_ROLE]: {
        key: PERMISSIONS.RBAC_DELETE_ROLE,
        resource: "rbac",
        action: "role_delete",
        label: "Xóa role",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 930,
    },
    [PERMISSIONS.RBAC_READ_PERMISSION]: {
        key: PERMISSIONS.RBAC_READ_PERMISSION,
        resource: "rbac",
        action: "permission_read",
        label: "Xem danh sách permissions",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 940,
    },
    [PERMISSIONS.RBAC_SET_ROLE_PERMISSIONS]: {
        key: PERMISSIONS.RBAC_SET_ROLE_PERMISSIONS,
        resource: "rbac",
        action: "set_role_permissions",
        label: "Gán permissions cho role",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 980,
    },
    [PERMISSIONS.RBAC_SET_USER_ROLES]: {
        key: PERMISSIONS.RBAC_SET_USER_ROLES,
        resource: "rbac",
        action: "set_user_roles",
        label: "Gán roles cho user",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 981,
    },
    [PERMISSIONS.RBAC_SET_USER_OVERRIDE]: {
        key: PERMISSIONS.RBAC_SET_USER_OVERRIDE,
        resource: "rbac",
        action: "set_user_override",
        label: "Gán quyền override cho user",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 982,
    },
    [PERMISSIONS.RBAC_REMOVE_USER_OVERRIDE]: {
        key: PERMISSIONS.RBAC_REMOVE_USER_OVERRIDE,
        resource: "rbac",
        action: "remove_user_override",
        label: "Gỡ quyền override của user",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 983,
    },
    [PERMISSIONS.RBAC_SYNC_ADMIN]: {
        key: PERMISSIONS.RBAC_SYNC_ADMIN,
        resource: "rbac",
        action: "sync_admin",
        label: "Sync quyền ADMIN (full access)",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 985,
    },
    [PERMISSIONS.RBAC_MANAGE]: {
        key: PERMISSIONS.RBAC_MANAGE,
        resource: "rbac",
        action: "manage",
        label: "Toàn quyền quản trị phân quyền (RBAC)",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 890,
    },



    [PERMISSIONS.AUDIT_SECURITY_READ]: {
        key: PERMISSIONS.AUDIT_SECURITY_READ,
        resource: "audit",
        action: "security_read",
        label: "Xem lịch sử đăng nhập & bảo mật",
        groupKey: PERMISSION_GROUPS.AUDIT.key,
        groupLabel: PERMISSION_GROUPS.AUDIT.label,
        order: 1020,
    },
    [PERMISSIONS.AUDIT_PRODUCT_READ]: {
        key: PERMISSIONS.AUDIT_PRODUCT_READ,
        resource: "audit",
        action: "read",
        label: "Lịch Sử Sản Phẩm",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 1000,
    },
    [PERMISSIONS.AUDIT_PRODUCT_ROLLBACK]: {
        key: PERMISSIONS.AUDIT_PRODUCT_ROLLBACK,
        resource: "audit",
        action: "rollback",
        label: "Rollback sản phẩm",
        groupKey: PERMISSION_GROUPS.SYSTEM.key,
        groupLabel: PERMISSION_GROUPS.SYSTEM.label,
        order: 1020,
    },
    [PERMISSIONS.AUDIT_PAYMENT_READ]: {
        key: PERMISSIONS.AUDIT_PAYMENT_READ,
        resource: "audit",
        action: "payment_read",
        label: "Xem lịch sử thanh toán",
        groupKey: PERMISSION_GROUPS.AUDIT.key,
        groupLabel: PERMISSION_GROUPS.AUDIT.label,
        order: 1030,
    },
});

//merge audit meta
const PERMISSION_META = Object.freeze({
    ...BASE_PERMISSION_META,
});

const PERMISSION_META_LIST = Object.freeze(Object.values(PERMISSION_META));

// =====================================================
// 3) ADMIN_SCREENS: map menu/screen + route/action -> permission
// =====================================================
const BASE_ADMIN_SCREENS = Object.freeze({
    DASHBOARD: {
  key: "dashboard",
  label: "Dashboard",
  icon: "home",
  order: 0,
  routes: ["/admin/dashboard"],
  public: false,
  accessAny: [
    PERMISSIONS.ORDER_DASHBOARD_READ,
    PERMISSIONS.ORDER_DASHBOARD_REBUILD, //  thêm (tuỳ bạn: có thể không thêm nếu chỉ dùng cho nút)
  ],
  actions: {
    view: [PERMISSIONS.ORDER_DASHBOARD_READ],
    rebuild: [PERMISSIONS.ORDER_DASHBOARD_REBUILD], //  thêm action này
  },
},


    PROFILE: {
        key: "profile",
        group: PERMISSION_GROUPS.USERS.key,
        label: "Profile",
        icon: "profile",
        order: 15,
        routes: ["/admin/profile"],
        public: true,
    },

    SETTINGS: {
        key: "settings",
        group: PERMISSION_GROUPS.SYSTEM.key,
        label: "Settings",
        icon: "settings",
        order: 16,
        routes: ["/admin/settings"],
        public: true,
    },

    USERS: {
        key: "user",
        group: PERMISSION_GROUPS.USERS.key,
        label: "Người dùng",
        icon: "users",
        order: 10,
        routes: [
            "/admin/user",
            "/admin/user/:id",
            "/admin/user/:id/status",
            "/admin/user/bulk/status",
            "/admin/user/bulk/delete",
            "/admin/user/me/avatar",
        ],
        accessAny: [
            PERMISSIONS.USER_READ,
            PERMISSIONS.USER_CREATE,
            PERMISSIONS.USER_UPDATE,
            PERMISSIONS.USER_DELETE,
            PERMISSIONS.USER_CHANGE_STATUS,
            PERMISSIONS.USER_BULK_STATUS,
            PERMISSIONS.USER_BULK_DELETE,
            PERMISSIONS.USER_UPLOAD_AVATAR,
            PERMISSIONS.USER_SET_ROLES,
        ],
        actions: {
            view: [PERMISSIONS.USER_READ],
            create: [PERMISSIONS.USER_CREATE],
            update: [PERMISSIONS.USER_UPDATE],
            delete: [PERMISSIONS.USER_DELETE],
            changeStatus: [PERMISSIONS.USER_CHANGE_STATUS],
            bulkStatus: [PERMISSIONS.USER_BULK_STATUS],
            bulkDelete: [PERMISSIONS.USER_BULK_DELETE],
            uploadAvatar: [PERMISSIONS.USER_UPLOAD_AVATAR],
            setRoles: [PERMISSIONS.USER_SET_ROLES],
            restore: [PERMISSIONS.USER_UPDATE],
        },
    },

    CATEGORIES: {
        key: "category",
        group: PERMISSION_GROUPS.CATALOG.key,
        label: "Danh mục",
        icon: "tags",
        order: 20,
        routes: ["/admin/category", "/admin/category/:id", "/admin/category/create", "/admin/category/:id/status"],
        accessAny: [
            PERMISSIONS.CATEGORY_READ,
            PERMISSIONS.CATEGORY_CREATE,
            PERMISSIONS.CATEGORY_UPDATE,
            PERMISSIONS.CATEGORY_DELETE,
            PERMISSIONS.CATEGORY_CHANGE_STATUS,
        ],
        actions: {
            view: [PERMISSIONS.CATEGORY_READ],
            create: [PERMISSIONS.CATEGORY_CREATE],
            update: [PERMISSIONS.CATEGORY_UPDATE],
            delete: [PERMISSIONS.CATEGORY_DELETE],
            changeStatus: [PERMISSIONS.CATEGORY_CHANGE_STATUS],
        },
    },

    PRODUCTS: {
        key: "product",
        group: PERMISSION_GROUPS.CATALOG.key,
        label: "Sản phẩm",
        icon: "package",
        order: 30,

        routes: ["/admin/product"],

        accessAny: [
            PERMISSIONS.PRODUCT_READ,
            PERMISSIONS.TEMPLATE_READ, //thêm
        ],

        actions: {
            view: [PERMISSIONS.PRODUCT_READ],
            create: [PERMISSIONS.PRODUCT_CREATE],
            update: [PERMISSIONS.PRODUCT_UPDATE],
            delete: [PERMISSIONS.PRODUCT_DELETE],
            changeStatus: [PERMISSIONS.PRODUCT_CHANGE_STATUS],
            audit: [PERMISSIONS.AUDIT_PRODUCT_READ],
        },


    },

    TEMPLATE: {
        key: "template",
        group: PERMISSION_GROUPS.TEMPLATE.key,
        label: "Mẫu mô tả",
        icon: "file-text",
        order: 50,

        routes: ["/admin/templates"],

        accessAny: [
            PERMISSIONS.TEMPLATE_READ,
        ],

        actions: {
            view: [PERMISSIONS.TEMPLATE_READ],
            create: [PERMISSIONS.TEMPLATE_CREATE],
            update: [PERMISSIONS.TEMPLATE_UPDATE],
            createVersion: [PERMISSIONS.TEMPLATE_CREATE_VERSION],
            activateVersion: [PERMISSIONS.TEMPLATE_ACTIVATE_VERSION],
        },
    },


    ORDERS: {
        key: "order",
        group: PERMISSION_GROUPS.ORDERS.key,
        label: "Đơn hàng",
        icon: "receipt",
        order: 40,
        routes: ["/admin/order", "/admin/order/:id", "/admin/order/:id/status"],
        accessAny: [
            PERMISSIONS.ORDER_READ,
            PERMISSIONS.ORDER_CREATE,
            PERMISSIONS.ORDER_UPDATE,
            PERMISSIONS.ORDER_DELETE,
            PERMISSIONS.ORDER_UPDATE_STATUS,
        ],
        actions: {
            view: [PERMISSIONS.ORDER_READ],
            create: [PERMISSIONS.ORDER_CREATE],
            update: [PERMISSIONS.ORDER_UPDATE],
            delete: [PERMISSIONS.ORDER_DELETE],
            changeStatus: [PERMISSIONS.ORDER_UPDATE_STATUS],
        },
    },

    // ===== STAFF =====
    ORDERS_INBOX: {
        key: "order-inbox",
        group: PERMISSION_GROUPS.STAFF.key,
        label: "Staff Inbox (claim đơn)",
        icon: "order", // quan trọng: sidebar ICON map của bạn có "order"
        order: 41,
        routes: ["/admin/order-inbox"],
        accessAny: [
            PERMISSIONS.ORDER_STAFF_INBOX_READ,
            PERMISSIONS.ORDER_STAFF_CLAIM,
        ],
        actions: {
            view: [PERMISSIONS.ORDER_STAFF_INBOX_READ],
            claim: [PERMISSIONS.ORDER_STAFF_CLAIM],
        },
    },

    MY_STAFF_ORDERS: {
        key: "my-staff-orders",
        group: PERMISSION_GROUPS.STAFF.key,
        label: "Đơn của tôi",
        icon: "order",
        order: 42,
        routes: ["/admin/my-staff-orders"],
        accessAny: [PERMISSIONS.ORDER_STAFF_MY_READ],
        actions: {
            view: [PERMISSIONS.ORDER_STAFF_MY_READ],
        },
    },

    // ===== SHIPPER =====
    SHIPPER_INBOX: {
        key: "shipper-inbox",
        group: PERMISSION_GROUPS.SHIPPER.key,
        label: "Shipper Inbox (nhận đơn)",
        icon: "order",
        order: 43,
        routes: ["/admin/shipper-inbox"],
        accessAny: [
            PERMISSIONS.ORDER_SHIPPER_INBOX_READ,
            PERMISSIONS.ORDER_SHIPPER_CLAIM,
        ],
        actions: {
            view: [PERMISSIONS.ORDER_SHIPPER_INBOX_READ],
            claim: [PERMISSIONS.ORDER_SHIPPER_CLAIM],
        },
    },

    MY_SHIPPER_ORDERS: {
        key: "my-shipper-orders",
        group: PERMISSION_GROUPS.SHIPPER.key,
        label: "Đơn tôi đang giao",
        icon: "order",
        order: 44,
        routes: ["/admin/my-shipper-orders"],
        accessAny: [PERMISSIONS.ORDER_SHIPPER_INBOX_READ], // hoặc tạo permission riêng "shipper_my_read" nếu muốn chuẩn
        actions: {
            view: [PERMISSIONS.ORDER_SHIPPER_MY_READ],
            delivered: [PERMISSIONS.ORDER_SHIPPER_DELIVER],
            cancel: [PERMISSIONS.ORDER_SHIPPER_CANCEL],
        },
    },

    AUDIT: {
        key: "audit",
        group: PERMISSION_GROUPS.AUDIT.key,
        label: "Audit Log",
        icon: "history",
        order: 95,

        children: [{
                key: "audit-product",
                label: "Lịch sử sản phẩm",
                routes: ["/admin/audit/product"],
                accessAny: [PERMISSIONS.AUDIT_PRODUCT_READ],
            },
            {
                key: "audit-security",
                label: "Lịch sử bảo mật",
                routes: ["/admin/audit/security"],
                accessAny: [PERMISSIONS.AUDIT_SECURITY_READ],
            },
            {
                key: "audit-user", 
                label: "Lịch sử người dùng",
                routes: ["/admin/audit/user"],
                accessAny: [PERMISSIONS.AUDIT_READ],
            },
            {
                key: "audit-payment",
                label: "Lịch sử thanh toán",
                routes: ["/admin/audit/payment"],
                accessAny: [PERMISSIONS.AUDIT_PAYMENT_READ],
            },

        ],

    },


    RBAC: {
        key: "rbac",
        group: PERMISSION_GROUPS.SYSTEM.key,
        label: "Phân quyền",
        icon: "shield",
        order: 90,
        routes: [
            "/admin/rbac",
            "/admin/rbac/roles",
            "/admin/rbac/permissions",
            "/admin/rbac/sync-admin",
            "/admin/rbac/role-permissions",
            "/admin/rbac/user-roles",
            "/admin/rbac/user-override",

        ],
        accessAny: [
            PERMISSIONS.RBAC_READ,
            PERMISSIONS.RBAC_READ_PERMISSION,
            PERMISSIONS.RBAC_CREATE_ROLE,
            PERMISSIONS.RBAC_UPDATE_ROLE,
            PERMISSIONS.RBAC_DELETE_ROLE,
            PERMISSIONS.RBAC_CREATE_PERMISSION,
            PERMISSIONS.RBAC_UPDATE_PERMISSION,
            PERMISSIONS.RBAC_DELETE_PERMISSION,
            PERMISSIONS.RBAC_SET_ROLE_PERMISSIONS,
            PERMISSIONS.RBAC_SET_USER_ROLES,
            PERMISSIONS.RBAC_SET_USER_OVERRIDE,
            PERMISSIONS.RBAC_REMOVE_USER_OVERRIDE,
            PERMISSIONS.RBAC_SYNC_ADMIN,
            PERMISSIONS.RBAC_MANAGE,

        ],
        actions: {
            view: [PERMISSIONS.RBAC_READ],
            listPermissions: [PERMISSIONS.RBAC_READ_PERMISSION],
            createRole: [PERMISSIONS.RBAC_CREATE_ROLE],
            updateRole: [PERMISSIONS.RBAC_UPDATE_ROLE],
            deleteRole: [PERMISSIONS.RBAC_DELETE_ROLE],
            setRolePermissions: [PERMISSIONS.RBAC_SET_ROLE_PERMISSIONS],
            setUserRoles: [PERMISSIONS.RBAC_SET_USER_ROLES],
            setUserOverride: [PERMISSIONS.RBAC_SET_USER_OVERRIDE],
            removeUserOverride: [PERMISSIONS.RBAC_REMOVE_USER_OVERRIDE],
            syncAdmin: [PERMISSIONS.RBAC_SYNC_ADMIN],
            manage: [PERMISSIONS.RBAC_MANAGE],
        },
    },
});

// merge Audit screens (menu cha/con)
const ADMIN_SCREENS = Object.freeze({
    ...BASE_ADMIN_SCREENS,
});

module.exports = {
    PERMISSIONS,
    PERMISSION_GROUPS,
    PERMISSION_META,
    PERMISSION_META_LIST,
    ADMIN_SCREENS,
};
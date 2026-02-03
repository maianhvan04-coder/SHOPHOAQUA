// src/constants/permission.groups.js
// Nhóm permission dùng chung (tránh circular import)

const PERMISSION_GROUPS = Object.freeze({
    USERS: { key: "USERS", label: "Người dùng", icon: "users", order: 10 },
    CATALOG: { key: "CATALOG", label: "Danh mục & Sản phẩm", icon: "box", order: 20 },
    TEMPLATE: { key: "TEMPLATE", label: "Mẫu mô tả", icon: "box", order: 25 },
    ORDERS: { key: "ORDERS", label: "Đơn hàng", icon: "receipt", order: 30 },
    STAFF: { key: "STAFF", label: "Nhân viên", icon: "staff", order: 40 },
    SHIPPER: { key: "SHIPPER", label: "Giao hàng", icon: "shipper", order: 50 },
    AUDIT: { key: "AUDIT", label: "Lịch sử hệ thống", icon: "audit", order: 80 },
    SYSTEM: { key: "SYSTEM", label: "Hệ thống", icon: "settings", order: 99 },
});

module.exports = { PERMISSION_GROUPS };

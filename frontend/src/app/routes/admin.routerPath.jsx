import { lazy } from "react";

/* ===== CORE ===== */
const Dashboard = lazy(() => import("~/pages/admin/Dashboard"));
const Users = lazy(() => import("~/pages/admin/Users"));
const Categories = lazy(() => import("~/features/category/pages/admin"));
const Products = lazy(() => import("~/pages/admin/Products"));

import ProductCreatePage from "~/pages/admin/products/ProductCreatePage";
import ProductEditPage from "~/pages/admin/products/ProductEditPage";
import ProductPreviewPage from "~/pages/admin/products/ProductPreviewPage";

/* ===== TEMPLATE ===== */
const TemplateList = lazy(() =>
  import("~/features/template/pages/TemplateListPage")
);
const TemplateCreate = lazy(() =>
  import("~/features/template/pages/TemplateCreatePage")
);
const TemplateDetail = lazy(() =>
  import("~/features/template/pages/TemplateDetailPage")
);
const TemplatePreview = lazy(() =>
  import("~/features/template/pages/TemplatePreviewPage")
);
const TemplateVersionEditPage = lazy(() =>
  import("~/features/template/pages/TemplateVersionEditPage")
);

/* ===== OTHER ===== */
const Rbac = lazy(() => import("~/pages/admin/Roles"));
const Orders = lazy(() =>
  import("~/features/order/pages/OrderManagementPage")
);
const InboxOrders = lazy(() =>
  import("~/features/order/pages/OrderInboxPage")
);
const MyStaffOrders = lazy(() =>
  import("~/features/order/pages/MyStaffOrdersPage")
);
const Profile = lazy(() => import("~/pages/admin/Profile"));
const Settings = lazy(() => import("~/pages/admin/Settings"));

const AuditProduct = lazy(() =>
  import("~/features/audit/pages/ProductAuditListPage")
);
const AuditSecurity = lazy(() =>
  import("~/features/audit/pages/SecurityAuditListPage")
);
const AuditProductDetails = lazy(() =>
  import("~/features/audit/pages/ProductAuditDetailPage")
);
const AuditPayment = lazy(() =>
  import("~/features/audit/pages/AuditPayment")
);

const ShipperInbox = lazy(() => import("~/features/order/pages/ShipperInboxPage"));
const MyShipperOrders = lazy(() => import("~/features/order/pages/MyShipperOrdersPage"));
export const adminRoutes = [
  { path: "dashboard", element: <Dashboard /> },

  { path: "user", element: <Users /> },
  { path: "category", element: <Categories /> },

  {
    path: "product",
    children: [
      { index: true, element: <Products /> },
      { path: "create", element: <ProductCreatePage /> },
      { path: ":id/edit", element: <ProductEditPage /> },
      { path: "preview", element: <ProductPreviewPage /> },
    ],
  },

  {
    path: "templates",
    children: [
      { index: true, element: <TemplateList /> },
      { path: "create", element: <TemplateCreate /> },
      { path: "preview", element: <TemplatePreview /> },
      { path: "details/:type", element: <TemplateDetail /> },
      {
        path: ":type/version/:version/edit",
        element: <TemplateVersionEditPage />,
      },
    ],
  },

  {
    path: "audit",
    children: [
      { path: "product", element: <AuditProduct /> },
      {
        path: "product/:auditId",
        element: <AuditProductDetails />,
      },
      { path: "security", element: <AuditSecurity /> },
      { path: "payment", element: <AuditPayment /> },
    ],
  },

  { path: "order", element: <Orders /> },
  { path: "order-inbox", element: <InboxOrders /> },
  { path: "my-staff-orders", element: <MyStaffOrders /> },
 // ===== SHIPPER (ADDED) =====
  { path: "shipper-inbox", element: <ShipperInbox /> },
  { path: "my-shipper-orders", element: <MyShipperOrders /> },
  { path: "rbac", element: <Rbac /> },
  { path: "profile", element: <Profile /> },
  { path: "settings", element: <Settings /> },
];

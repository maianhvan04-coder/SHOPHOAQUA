// src/api/auditpaymentApi.js

import apiClient from "~/services/apiClient";
import { endpoints } from "~/services/endpoints";

export const paymentApi = {
  // Admin xem lịch sử thanh toán
  adminList: (params = {}) =>
    apiClient.get(endpoints.payments.adminList, { params }),

  // User xem lịch sử của mình
  my: (params = {}) =>
    apiClient.get(endpoints.payments.my, { params }),
};

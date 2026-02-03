// features/audit/hooks/useAuditPayments.js

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { paymentApi } from "~/api/auditpaymentApi";

const DEFAULT_FILTERS = {
  type: "PAYMENT",
  status: "SUCCESS",
  method: "",
  from: "",
  to: "",
  orderId: "",
  userId: "",
  staffId: "",
  transactionId: "",
  dateField: "paidAt",
};

export function useAuditPayments(options = {}) {
  const initial = {
    ...DEFAULT_FILTERS,
    ...(options.initialFilters || {}),
  };

  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(options.initialPage || 1);
  const [limit, setLimit] = useState(options.initialLimit || 20);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((total || 0) / (limit || 20)));
  }, [total, limit]);

  const params = useMemo(() => {
    const p = {
      page,
      limit,
      ...filters,
    };

    // bỏ params rỗng để URL gọn
    Object.keys(p).forEach((k) => {
      if (p[k] === "" || p[k] == null) delete p[k];
    });

    return p;
  }, [page, limit, filters]);

  const fetchData = useCallback(
    async (overrideParams = {}) => {
      setLoading(true);
      setError(null);

      // cancel request cũ nếu có
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await paymentApi.adminList({ ...params, ...overrideParams }, { signal: controller.signal });
        const data = res?.data?.data;

        setItems(data?.items || []);
        setTotal(data?.pagination?.total || 0);

        // sync page/limit nếu BE trả khác
        if (data?.pagination?.page) setPage(data.pagination.page);
        if (data?.pagination?.limit) setLimit(data.pagination.limit);

        return data;
      } catch (e) {
        // ignore abort
        if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [params]
  );

  // auto fetch khi page/limit/filters đổi (filters là “applied filters”)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters]);

  const applyFilters = useCallback((nextFilters = {}) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...nextFilters }));
  }, []);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  return {
    // data
    items,
    loading,
    error,

    // pagination
    page,
    limit,
    total,
    totalPages,
    setPage,
    setLimit,
    nextPage,
    prevPage,

    // filters (applied)
    filters,
    applyFilters,

    // actions
    refresh,
    fetchData,
  };
}

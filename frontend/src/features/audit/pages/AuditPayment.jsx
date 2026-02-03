// features/audit/pages/AuditPayment.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Stack,
  Tag,
  TagLabel,
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Select,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
  useColorModeValue,
  SimpleGrid,
  Button,
  Badge,
} from "@chakra-ui/react";
import { SearchIcon, CloseIcon, CopyIcon } from "@chakra-ui/icons";
import { useAuditPayments } from "../hooks/useAuditPayments";

/** ✅ sửa route ở đây cho đúng dự án bạn */
const ORDER_DETAIL_PATH = (orderId) => `/admin/orders/${orderId}`;

function formatMoneyVND(v = 0) {
  return Number(v || 0).toLocaleString("vi-VN") + " ₫";
}

function safeDate(d) {
  const x = d ? new Date(d) : null;
  return x && !Number.isNaN(x.getTime()) ? x : null;
}

function pickTime(it) {
  return safeDate(it?.updatedAt) || safeDate(it?.paidAt) || safeDate(it?.createdAt) || null;
}

function dayKeyVN(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function labelDayVN(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);

  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((t0 - d0) / 86400000);

  if (diffDays === 0) return "HÔM NAY";
  if (diffDays === 1) return "HÔM QUA";
  return dt
    .toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .toUpperCase();
}

function copyText(txt) {
  if (!txt) return;
  navigator.clipboard?.writeText(String(txt)).catch(() => {});
}

function normalizeText(s = "") {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseUA(ua = "") {
  const s = String(ua || "");
  let browser = "-";
  let os = "-";
  let device = "-";

  const chrome = s.match(/Chrome\/([\d.]+)/);
  const edg = s.match(/Edg\/([\d.]+)/);
  const safari = s.match(/Version\/([\d.]+).*Safari/);
  const firefox = s.match(/Firefox\/([\d.]+)/);

  if (edg) browser = `Edge ${edg[1]}`;
  else if (chrome) browser = `Chrome ${chrome[1]}`;
  else if (firefox) browser = `Firefox ${firefox[1]}`;
  else if (safari) browser = `Safari ${safari[1]}`;

  if (s.includes("Windows NT 10.0")) os = "Windows 10";
  else if (s.includes("Windows NT 11.0")) os = "Windows 11";
  else if (s.includes("Mac OS X")) os = "macOS";
  else if (s.includes("Android")) os = "Android";
  else if (s.includes("iPhone") || s.includes("iPad")) os = "iOS";

  device = /Mobile|Android|iPhone|iPad/i.test(s) ? "mobile" : "desktop";
  return { browser, os, device };
}

function roleColor(role = "") {
  const r = String(role || "").toUpperCase();
  if (r.includes("ADMIN")) return "purple";
  if (r.includes("STAFF")) return "blue";
  if (r.includes("SHIPPER")) return "orange";
  if (r.includes("CLIENT") || r.includes("USER") || r.includes("BUYER")) return "gray";
  return "gray";
}

function actionColor(action = "") {
  const a = String(action || "").toUpperCase();
  if (a.includes("THANH TOÁN") || a.includes("PAYMENT")) return "green";
  if (a.includes("HOÀN TIỀN") || a.includes("REFUND")) return "orange";
  if (a.includes("XOÁ") || a.includes("DELETE")) return "red";
  if (a.includes("TẠO") || a.includes("CREATE")) return "green";
  if (a.includes("SỬA") || a.includes("UPDATE") || a.includes("EDIT")) return "blue";
  return "gray";
}

function actionLabel(it) {
  const raw = it?.action || it?.event || it?.type || "PAYMENT";
  const a = String(raw || "").toUpperCase();
  if (a.includes("PAYMENT")) return "THANH TOÁN";
  if (a.includes("REFUND")) return "HOÀN TIỀN";
  if (a.includes("UPDATE") || a.includes("EDIT")) return "SỬA";
  if (a.includes("CREATE")) return "TẠO";
  if (a.includes("DELETE")) return "XOÁ";
  return a;
}

function getPeople(it) {
  const buyer = it?.user || null;
  const staff = it?.order?.staff || null;
  const shipper = it?.order?.shipper || null;

  const buyerName = buyer?.fullName || buyer?.name || "Khách";
  const buyerEmail = buyer?.email || "";
  const buyerRole = String(buyer?.role || buyer?.type || "USER").toUpperCase();

  const staffName = staff?.fullName || staff?.name || "-";
  const staffEmail = staff?.email || "";
  const staffRole = String(staff?.role || staff?.type || "STAFF").toUpperCase();

  const shipperName = shipper?.fullName || shipper?.name || "-";
  const shipperEmail = shipper?.email || "";
  const shipperRole = String(shipper?.role || shipper?.type || "SHIPPER").toUpperCase();

  return {
    buyer,
    staff,
    shipper,
    buyerName,
    buyerEmail,
    buyerRole,
    staffName,
    staffEmail,
    staffRole,
    shipperName,
    shipperEmail,
    shipperRole,
  };
}

function roleMatches(it, role) {
  if (!role || role === "ALL") return true;

  const { buyerRole, staffRole, shipperRole, staff, shipper, buyer } = getPeople(it);
  const R = String(role).toUpperCase();

  if (R === "USER") {
    // coi USER/CLIENT là nhóm người mua
    return !!buyer && (buyerRole.includes("USER") || buyerRole.includes("CLIENT"));
  }
  if (R === "STAFF") return !!staff && staffRole.includes("STAFF");
  if (R === "SHIPPER") return !!shipper && shipperRole.includes("SHIPPER");
  if (R === "ADMIN") {
    // admin có thể nằm ở buyerRole hoặc staffRole
    return (buyerRole && buyerRole.includes("ADMIN")) || (staffRole && staffRole.includes("ADMIN"));
  }
  return true;
}

function haystackByRole(it, role) {
  const {
    buyerName,
    buyerEmail,
    staffName,
    staffEmail,
    shipperName,
    shipperEmail,
  } = getPeople(it);
  const orderId = it?.order?._id || it?.orderId || "";

  const R = String(role || "ALL").toUpperCase();
  if (R === "USER") return `${buyerName} ${buyerEmail} ${orderId}`;
  if (R === "STAFF") return `${staffName} ${staffEmail} ${orderId}`;
  if (R === "SHIPPER") return `${shipperName} ${shipperEmail} ${orderId}`;
  if (R === "ADMIN") return `${buyerName} ${buyerEmail} ${staffName} ${staffEmail} ${orderId}`;
  return `${buyerName} ${buyerEmail} ${staffName} ${staffEmail} ${shipperName} ${shipperEmail} ${orderId}`;
}

function PersonLine({ label, name, email, roleText, borderColor, subtle }) {
  return (
    <Box>
      <Text fontSize="sm" color={subtle} fontWeight="700">
        {label}
      </Text>

      <Text fontWeight="800" mt={1}>
        {name || "-"}
      </Text>

      <HStack mt={1} spacing={1} align="center">
        <Text color={subtle} fontSize="sm">
          {email || "-"}
        </Text>
        {email ? (
          <IconButton
            size="xs"
            aria-label="copy email"
            icon={<CopyIcon />}
            variant="ghost"
            onClick={() => copyText(email)}
          />
        ) : null}
      </HStack>

      <Tag mt={2} size="sm" variant="subtle" colorScheme={roleColor(roleText)}>
        <TagLabel>{roleText}</TagLabel>
      </Tag>

      <Divider mt={4} borderColor={borderColor} />
    </Box>
  );
}

export default function AuditPayment() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const {
    items = [],
    loading,
    error,
    page,
    total,
    totalPages,
    prevPage,
    nextPage,
    applyFilters,
  } = useAuditPayments({
    initialFilters: { type: "PAYMENT", status: "SUCCESS" },
    initialPage: 1,
    initialLimit: 20,
  });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selected, setSelected] = useState(null);

  const bg = useColorModeValue("white", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const subtle = useColorModeValue("gray.600", "gray.300");
  const listHeaderBg = useColorModeValue("gray.50", "whiteAlpha.50");

  const onFilter = () => {
    // ✅ backend bạn đang nhận from/to/status/type là chắc ăn
    // q + role mình xử lý FE cho đúng "tìm theo tên/email" và role theo USER/STAFF/SHIPPER/ADMIN
    applyFilters({
      from: from || "",
      to: to || "",
      status: "SUCCESS",
      type: "PAYMENT",
    });
  };

  const onReset = () => {
    setQ("");
    setRole("ALL");
    setFrom("");
    setTo("");
    applyFilters({
      from: "",
      to: "",
      status: "SUCCESS",
      type: "PAYMENT",
    });
  };

  // ✅ Lọc FE theo role + search q
  const filteredItems = useMemo(() => {
    const qq = normalizeText(q);
    return (items || [])
      .filter((it) => roleMatches(it, role))
      .filter((it) => {
        if (!qq) return true;
        const h = normalizeText(haystackByRole(it, role));
        return h.includes(qq);
      });
  }, [items, q, role]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of filteredItems) {
      const dt = pickTime(it) || new Date();
      const key = dayKeyVN(dt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a > b ? -1 : 1));
    return keys.map((k) => ({
      key: k,
      label: labelDayVN(k),
      items: (map.get(k) || []).slice().sort((a, b) => {
        const da = pickTime(a) || new Date(0);
        const db = pickTime(b) || new Date(0);
        return db - da;
      }),
    }));
  }, [filteredItems]);

  const openDetail = (it) => {
    setSelected(it);
    onOpen();
  };

  const pageText = useMemo(() => {
    const shown = filteredItems.length;
    const all = total || 0;
    return `Hiển thị: ${shown} • Tổng: ${all} • Trang ${page || 1}/${totalPages || 1}`;
  }, [filteredItems.length, total, page, totalPages]);

  const goOrderDetail = (orderId) => {
    if (!orderId || orderId === "-") return;
    navigate(ORDER_DETAIL_PATH(orderId));
  };

  return (
    <Box p={{ base: 3, md: 6 }} bg={bg} minH="100vh">
      <Stack spacing={4}>
        {/* Header + Filters */}
        <Card bg={cardBg} border="1px solid" borderColor={border} shadow="sm">
          <CardBody>
            <Heading size="lg">Lịch sử thanh toán</Heading>

            <Box mt={4}>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Tìm theo tên hoặc email..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onFilter()}
                />
              </InputGroup>
            </Box>

            <HStack mt={3} spacing={3} flexWrap="wrap" align="end">
              <Box>
                <Text fontSize="sm" color={subtle} mb={1}>
                  Role
                </Text>
                <Select value={role} onChange={(e) => setRole(e.target.value)} w="220px">
                  <option value="ALL">Tất cả</option>
                  <option value="USER">USER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="SHIPPER">SHIPPER</option>
                  <option value="ADMIN">ADMIN</option>
                </Select>
              </Box>

              <Box>
                <Text fontSize="sm" color={subtle} mb={1}>
                  Từ ngày
                </Text>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} w="190px" />
              </Box>

              <Box>
                <Text fontSize="sm" color={subtle} mb={1}>
                  Đến ngày
                </Text>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} w="190px" />
              </Box>

              <HStack spacing={2}>
                <Button onClick={onFilter} isDisabled={loading}>
                  Lọc
                </Button>
                <IconButton
                  aria-label="Reset"
                  icon={<CloseIcon />}
                  variant="ghost"
                  onClick={onReset}
                  isDisabled={loading}
                />
              </HStack>

              <Box flex="1" />

              <Tag variant="subtle" colorScheme="blue">
                <TagLabel>{pageText}</TagLabel>
              </Tag>
            </HStack>
          </CardBody>
        </Card>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error?.response?.data?.message || error.message || "Lỗi tải dữ liệu"}
          </Alert>
        )}

        {/* LIST */}
        <Card bg={cardBg} border="1px solid" borderColor={border} shadow="sm" overflow="hidden">
          <CardBody p={0}>
            {loading ? (
              <VStack py={12}>
                <Spinner />
                <Text color={subtle}>Đang tải...</Text>
              </VStack>
            ) : (
              <Box>
                {groups.map((g) => (
                  <Box key={g.key}>
                    <Box px={5} py={3} bg={listHeaderBg} borderBottom="1px solid" borderColor={border}>
                      <Text fontSize="sm" fontWeight="800" color={subtle}>
                        {g.label}
                      </Text>
                    </Box>

                    <Box>
                      {g.items.map((it) => {
                        const { buyerName, buyerRole } = getPeople(it);

                        const dt = pickTime(it);
                        const timeText = dt
                          ? dt.toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "--:--:--";

                        const orderId = it?.order?._id || it?.orderId || "-";
                        const title = orderId === "-" ? "Giao dịch" : `Đơn ${orderId}`;

                        const act = actionLabel(it);
                        const ua = it?.client?.ua || it?.client?.userAgent || "";
                        const { browser, os, device } = parseUA(ua);

                        return (
                          <Box key={it._id} px={5} py={4} borderBottom="1px solid" borderColor={border}>
                            <HStack align="start" justify="space-between" gap={4}>
                              <HStack align="start" spacing={3} minW="0">
                                <Avatar size="sm" name={buyerName} />

                                <Box minW="0">
                                  <HStack spacing={2} flexWrap="wrap">
                                    <Text fontWeight="800" noOfLines={1}>
                                      {buyerName}
                                    </Text>

                                    <Tag size="sm" variant="subtle" colorScheme={actionColor(act)}>
                                      <TagLabel>{act}</TagLabel>
                                    </Tag>

                                    <Tag size="sm" variant="subtle" colorScheme={roleColor(buyerRole)}>
                                      <TagLabel>{buyerRole}</TagLabel>
                                    </Tag>
                                  </HStack>

                                  <Text mt={2} fontSize="lg" fontWeight="700" noOfLines={1}>
                                    {title}
                                  </Text>

                                  <VStack align="start" spacing={1} mt={2}>
                                    <Text fontSize="sm" color={subtle}>
                                      🌐 {browser}
                                    </Text>
                                    <Text fontSize="sm" color={subtle}>
                                      🧩 {os}
                                    </Text>
                                    <Text fontSize="sm" color={subtle}>
                                      💻 {device}
                                    </Text>
                                  </VStack>

                                  <Text mt={2} fontSize="sm" color={subtle}>
                                    Số tiền:{" "}
                                    <Text as="span" fontWeight="700" color="inherit">
                                      {formatMoneyVND(it?.amount || 0)}
                                    </Text>
                                  </Text>
                                </Box>
                              </HStack>

                              <VStack align="end" spacing={2} minW="120px">
                                <Text fontSize="sm" color={subtle}>
                                  {timeText}
                                </Text>
                                <Button size="sm" variant="link" colorScheme="blue" onClick={() => openDetail(it)}>
                                  Chi tiết &gt;
                                </Button>
                              </VStack>
                            </HStack>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))}

                {filteredItems.length === 0 && (
                  <VStack py={12}>
                    <Text color={subtle}>Không có dữ liệu</Text>
                    <Text fontSize="sm" color={subtle}>
                      Thử đổi khoảng ngày / role hoặc nhập tên/email.
                    </Text>
                  </VStack>
                )}

                <HStack justify="space-between" px={5} py={4}>
                  <Text fontSize="sm" color={subtle}>
                    {pageText}
                  </Text>
                  <HStack>
                    <Button size="sm" variant="outline" onClick={prevPage} isDisabled={loading || page <= 1}>
                      Prev
                    </Button>
                    <Button size="sm" onClick={nextPage} isDisabled={loading || page >= totalPages}>
                      Next
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            )}
          </CardBody>
        </Card>
      </Stack>

      {/* DETAIL DRAWER */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottom="1px solid" borderColor={border}>
            <HStack justify="space-between" pr={10}>
              <Box>
                <Text fontSize="lg" fontWeight="800">
                  Chi tiết Audit Thanh toán
                </Text>
                <HStack spacing={2} mt={1} flexWrap="wrap">
                  <Text fontSize="sm" color={subtle}>
                    Audit ID: {selected?._id ? String(selected._id).slice(0, 12) + "…" : "-"}
                  </Text>
                  <Text fontSize="sm" color={subtle}>
                    • {pickTime(selected)?.toLocaleString("vi-VN") || "-"}
                  </Text>
                </HStack>
              </Box>

              <Button size="sm" colorScheme="blue" variant="outline">
                UPDATE
              </Button>
            </HStack>
          </DrawerHeader>

          <DrawerBody bg={useColorModeValue("gray.50", "gray.900")}>
            {!selected ? (
              <Text color={subtle} mt={4}>
                Không có dữ liệu
              </Text>
            ) : (
              <Box py={5}>
                {(() => {
                  const {
                    buyerName,
                    buyerEmail,
                    buyerRole,
                    staffName,
                    staffEmail,
                    staffRole,
                    shipperName,
                    shipperEmail,
                    shipperRole,
                  } = getPeople(selected);

                  const ip = selected?.client?.ip || selected?.ip || "-";
                  const ua = selected?.client?.ua || selected?.client?.userAgent || "";
                  const { browser, os, device } = parseUA(ua);

                  const orderId = selected?.order?._id || selected?.orderId || "-";

                  return (
                    <>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Card
                          bg={useColorModeValue("purple.50", "whiteAlpha.50")}
                          border="1px solid"
                          borderColor={border}
                          shadow="sm"
                        >
                          <CardBody>
                            <Text fontWeight="900" fontSize="xl" mb={4}>
                              Người thao tác
                            </Text>

                            <PersonLine
                              label="Người mua / Thanh toán"
                              name={buyerName}
                              email={buyerEmail}
                              roleText={buyerRole || "USER"}
                              borderColor={border}
                              subtle={subtle}
                            />

                            <PersonLine
                              label="Staff phụ trách"
                              name={staffName}
                              email={staffEmail}
                              roleText={staffRole || "STAFF"}
                              borderColor={border}
                              subtle={subtle}
                            />

                            <Box mt={4}>
                              <Text fontSize="sm" color={subtle} fontWeight="700">
                                Shipper giao
                              </Text>
                              <Text fontWeight="800" mt={1}>
                                {shipperName || "-"}
                              </Text>
                              <HStack mt={1} spacing={1} align="center">
                                <Text color={subtle} fontSize="sm">
                                  {shipperEmail || "-"}
                                </Text>
                                {shipperEmail ? (
                                  <IconButton
                                    size="xs"
                                    aria-label="copy shipper email"
                                    icon={<CopyIcon />}
                                    variant="ghost"
                                    onClick={() => copyText(shipperEmail)}
                                  />
                                ) : null}
                              </HStack>

                              <Tag mt={2} size="sm" variant="subtle" colorScheme={roleColor(shipperRole)}>
                                <TagLabel>{shipperRole || "SHIPPER"}</TagLabel>
                              </Tag>
                            </Box>
                          </CardBody>
                        </Card>

                        <Card
                          bg={useColorModeValue("cyan.50", "whiteAlpha.50")}
                          border="1px solid"
                          borderColor={border}
                          shadow="sm"
                        >
                          <CardBody>
                            <Text fontWeight="900" fontSize="xl" mb={4}>
                              Thông tin hệ thống
                            </Text>

                            <Text fontSize="sm" color={subtle}>
                              IP ADDRESS
                            </Text>
                            <HStack mb={3}>
                              <Text fontWeight="800">{ip}</Text>
                              {ip && ip !== "-" ? (
                                <IconButton
                                  size="xs"
                                  aria-label="copy ip"
                                  icon={<CopyIcon />}
                                  variant="ghost"
                                  onClick={() => copyText(ip)}
                                />
                              ) : null}
                            </HStack>

                            <Text fontSize="sm" color={subtle} mb={2}>
                              USER AGENT
                            </Text>

                            <VStack align="start" spacing={1}>
                              <Text fontSize="sm" color={subtle}>
                                🌐 {browser}
                              </Text>
                              <Text fontSize="sm" color={subtle}>
                                🧩 {os}
                              </Text>
                              <Text fontSize="sm" color={subtle}>
                                💻 {device}
                              </Text>
                            </VStack>

                            {ua ? (
                              <>
                                <Divider my={3} />
                                <Text fontSize="xs" color={subtle} noOfLines={3}>
                                  {ua}
                                </Text>
                              </>
                            ) : null}
                          </CardBody>
                        </Card>

                        <Card
                          bg={useColorModeValue("orange.50", "whiteAlpha.50")}
                          border="1px solid"
                          borderColor={border}
                          shadow="sm"
                        >
                          <CardBody>
                            <Text fontWeight="900" fontSize="xl" mb={4}>
                              Tài nguyên
                            </Text>

                            <Text fontSize="sm" color={subtle}>
                              ORDER ID
                            </Text>
                            <HStack mb={3}>
                              <Text fontWeight="800">{orderId}</Text>
                              {orderId && orderId !== "-" ? (
                                <IconButton
                                  size="xs"
                                  aria-label="copy orderId"
                                  icon={<CopyIcon />}
                                  variant="ghost"
                                  onClick={() => copyText(orderId)}
                                />
                              ) : null}
                            </HStack>

                            {/* ✅ navigate sang order detail */}
                            <Button
                              w="full"
                              colorScheme="orange"
                              isDisabled={!orderId || orderId === "-"}
                              onClick={() => goOrderDetail(orderId)}
                            >
                              Xem đơn hàng
                            </Button>

                            <Divider my={4} />

                            <HStack justify="space-between">
                              <Badge variant="subtle">{selected?.method || "COD"}</Badge>
                              <Badge colorScheme={selected?.status === "SUCCESS" ? "green" : "gray"}>
                                {selected?.status || "SUCCESS"}
                              </Badge>
                            </HStack>

                            <Text mt={3} fontWeight="900" fontSize="lg">
                              {formatMoneyVND(selected?.amount || 0)}
                            </Text>
                          </CardBody>
                        </Card>
                      </SimpleGrid>

                      <Divider my={5} />
                    </>
                  );
                })()}
              </Box>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

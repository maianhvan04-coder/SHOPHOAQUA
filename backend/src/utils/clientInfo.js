// src/api/v1/utils/clientInfo.js

module.exports.getClientInfo = (req) => {
  const xff = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(xff) ? xff[0] : (xff || ""))
      .split(",")[0]
      .trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";

  const userAgent = req.headers["user-agent"] || "";
  const deviceId = req.headers["x-device-id"] || ""; // FE có thể tự set header này

  return { ip, userAgent, deviceId };
};

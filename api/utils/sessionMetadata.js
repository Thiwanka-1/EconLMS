const findFirstMatch = (value, candidates, fallback) => {
  const match = candidates.find(([pattern]) => pattern.test(value));
  return match?.[1] || fallback;
};

export const parseSessionUserAgent = (userAgent = "") => {
  const value = String(userAgent).slice(0, 1000);

  const browser = findFirstMatch(
    value,
    [
      [/Edg\//i, "Microsoft Edge"],
      [/OPR\//i, "Opera"],
      [/SamsungBrowser\//i, "Samsung Internet"],
      [/CriOS\//i, "Google Chrome"],
      [/Chrome\//i, "Google Chrome"],
      [/FxiOS\//i, "Mozilla Firefox"],
      [/Firefox\//i, "Mozilla Firefox"],
      [/Safari\//i, "Safari"],
    ],
    "Unknown browser"
  );

  const operatingSystem = findFirstMatch(
    value,
    [
      [/Windows NT/i, "Windows"],
      [/Android/i, "Android"],
      [/(iPhone|iPad|iPod)/i, "iOS"],
      [/Mac OS X/i, "macOS"],
      [/CrOS/i, "ChromeOS"],
      [/Linux/i, "Linux"],
    ],
    "Unknown operating system"
  );

  const deviceType = /iPad|Tablet|Android(?!.*Mobile)/i.test(value)
    ? "Tablet"
    : /Mobile|iPhone|iPod|Android/i.test(value)
      ? "Mobile"
      : "Computer";

  return {
    browser,
    operatingSystem,
    deviceName: `${browser} on ${operatingSystem} ${deviceType.toLowerCase()}`,
  };
};

export const normalizeSessionIp = (value = "") => {
  const firstValue = String(value).split(",")[0].trim();
  return firstValue.replace(/^::ffff:/, "").slice(0, 100);
};

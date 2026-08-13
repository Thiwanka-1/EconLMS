import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

import {
  normalizeSessionIp,
  parseSessionUserAgent,
} from "../utils/sessionMetadata.js";

import {
  generateAuthToken,
} from "../utils/token.js";

test("authentication tokens are bound to an individual session", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpiry = process.env.JWT_EXPIRES_IN;
  process.env.JWT_SECRET = "test-only-session-jwt-secret-123456789012345";
  process.env.JWT_EXPIRES_IN = "1h";

  try {
    const token = generateAuthToken(
      {
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        authVersion: 4,
      },
      {
        sessionId: "507f191e810c19729de860ea",
      }
    );

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.equal(decoded.sub, "507f1f77bcf86cd799439011");
    assert.equal(decoded.sid, "507f191e810c19729de860ea");
    assert.equal(decoded.ver, 4);
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;

    if (originalExpiry === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = originalExpiry;
  }
});

test("session metadata identifies common desktop and mobile clients", () => {
  const desktop = parseSessionUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36"
  );
  const mobile = parseSessionUserAgent(
    "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 Chrome/127.0 Mobile Safari/537.36"
  );

  assert.equal(desktop.browser, "Google Chrome");
  assert.equal(desktop.operatingSystem, "Windows");
  assert.match(desktop.deviceName, /computer/i);
  assert.equal(mobile.operatingSystem, "Android");
  assert.match(mobile.deviceName, /mobile/i);
});

test("forwarded and IPv4-mapped session addresses are normalized", () => {
  assert.equal(normalizeSessionIp("::ffff:192.0.2.10"), "192.0.2.10");
  assert.equal(normalizeSessionIp("203.0.113.7, 10.0.0.2"), "203.0.113.7");
});

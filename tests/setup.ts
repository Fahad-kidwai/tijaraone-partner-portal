import fs from "node:fs";
import path from "node:path";

// Load .env.local for integration tests (OTP/auth against the Neon DEV branch).
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      if (!process.env[key]) process.env[key] = match[2].trim().replace(/^"|"$/g, "");
    }
  }
}
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-chars-long";
process.env.OTP_PEPPER ??= "test-otp-pepper-at-least-32-chars-long!";

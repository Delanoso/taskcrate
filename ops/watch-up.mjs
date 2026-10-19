import fs from "node:fs";
import nodemailer from "nodemailer";

const ROOT = "/opt/taskcrate";
const STATE = "/var/lib/taskcrate-watch.json";
const PORT = 3847;
const REMIND_MS = 6 * 60 * 60 * 1000;

function readEnv() {
  const out = {};
  const text = fs.readFileSync(`${ROOT}/.env`, "utf8");
  for (const line of text.split(/\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[match[1]] = value;
  }
  return out;
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return null;
  }
}

async function siteIsUp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/`, { signal: controller.signal, redirect: "manual" });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function send(env, subject, text) {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: Number(env.SMTP_PORT || 587) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: env.ALERT_EMAIL || "erich@delanosolutions.co.za",
    subject,
    text,
  });
}

const env = readEnv();
const up = await siteIsUp();
const previous = readState();
const now = Date.now();
const wasDown = previous?.status === "down";

if (up && !wasDown) {
  fs.mkdirSync("/var/lib", { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify({ status: "up", at: now }));
  process.exit(0);
}

if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) process.exit(up ? 0 : 1);

if (!up && !wasDown) {
  await send(env, "[TaskCrate] The site is down", `TaskCrate did not answer on port ${PORT} at ${new Date(now).toISOString()}. The other apps on this server were not restarted.`);
  fs.writeFileSync(STATE, JSON.stringify({ status: "down", at: now }));
} else if (!up && wasDown && now - Number(previous.at || 0) > REMIND_MS) {
  await send(env, "[TaskCrate] The site is still down", `TaskCrate has not answered on port ${PORT} since ${new Date(previous.at).toISOString()}.`);
  fs.writeFileSync(STATE, JSON.stringify({ status: "down", at: now }));
} else if (up && wasDown) {
  await send(env, "[TaskCrate] The site is back", `TaskCrate answered again on port ${PORT} at ${new Date(now).toISOString()}.`);
  fs.writeFileSync(STATE, JSON.stringify({ status: "up", at: now }));
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = process.env.CREW_URL || "http://localhost:5173";

const candidates = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  path.join(os.homedir(), "AppData/Local/Google/Chrome/Application/chrome.exe"),
].filter(Boolean);

const bin = candidates.find((p) => p && fs.existsSync(p));
if (!bin) {
  console.error("Chrome of Edge niet gevonden. Open", url, "en kies ‘Installeren’ in de adresbalk.");
  process.exit(1);
}

const profile = path.join(os.tmpdir(), "crew-desktop-profile");
fs.mkdirSync(profile, { recursive: true });

const child = spawn(
  bin,
  [`--app=${url}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--new-window"],
  { detached: true, stdio: "ignore" },
);
child.unref();
console.log("Crew geopend als app-venster:", url);

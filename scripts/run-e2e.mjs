import { spawn } from "node:child_process";

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with ${code}`)),
    );
  });
await run(process.execPath, ["node_modules/next/dist/bin/next", "build"]);
const port = "3107",
  base = `http://127.0.0.1:${port}`,
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port],
    { stdio: "inherit", env: { ...process.env, PORT: port } },
  );
let ready = false;
try {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error("Production test server did not become healthy");
  await run(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
    env: { ...process.env, PLAYWRIGHT_BASE_URL: base },
  });
} finally {
  server.kill("SIGTERM");
}

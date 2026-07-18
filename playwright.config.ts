import { defineConfig,devices } from "@playwright/test";
export default defineConfig({testDir:"./e2e",fullyParallel:false,workers:1,timeout:45000,expect:{timeout:10000},use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||"http://127.0.0.1:3000",trace:"on-first-retry"},projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}]});

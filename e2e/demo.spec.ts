import { test,expect } from "@playwright/test";
test("essential governed demo flow",async({page})=>{
 await page.goto("/overview");await expect(page.getByText("Retention intelligence at a glance")).toBeVisible();await expect(page.getByText("Synthetic Demo Data").first()).toBeVisible();
 await page.getByText("Conversations",{exact:true}).first().click();const analysisResponse=page.waitForResponse(r=>r.url().includes("/api/avo/analyze")&&r.request().method()==="POST",{timeout:30000});await page.getByRole("button",{name:"Run AVO Analysis"}).click();expect((await analysisResponse).ok()).toBe(true);await expect(page.getByText("AVO Demo Analysis",{exact:true}).last()).toBeVisible({timeout:15000});await expect(page.getByText("MSG-A-104",{exact:false}).last()).toBeVisible();
 await page.getByText("Retention Actions",{exact:true}).click();await page.getByLabel("Demo role").selectOption("Sales Manager");await page.getByRole("button",{name:"Approve",exact:true}).click();await expect(page.getByText("Approved",{exact:true}).first()).toBeVisible();
 await page.getByText("Marketing Intelligence",{exact:true}).click();await expect(page.getByText("MKT-003",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:"Create campaign with AVO"}).click();await expect(page.getByText("CAM-003",{exact:false})).toBeVisible();
 await page.getByText("Audit Reports",{exact:true}).click();await expect(page.getByText("AUD-9201")).toBeVisible();
});

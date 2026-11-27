import fs from "fs";
import { spawnSync } from "child_process";
import path from "path";
import { defineConfig } from "cypress";

const webPort = process.env.WEB_PORT || "8088";
const baseUrl = process.env.CYPRESS_BASE_URL || `http://localhost:${webPort}`;

// Cypress 16: Cypress.env() is gone.
// - Non-secret values go in `expose`, read with Cypress.expose("KEY").
// - Secrets stay in `env`, read with cy.env(["KEY"]).then(...).
// Values come from the CYPRESS_* vars in .env (env-cmd / dotenv).
const expose = {
   TENANT: process.env.CYPRESS_TENANT,
   STACK: process.env.CYPRESS_STACK,
   USER_EMAIL: process.env.CYPRESS_USER_EMAIL,
};
const env = {
   USER_PASSWORD: process.env.CYPRESS_USER_PASSWORD,
   DB_USER: process.env.CYPRESS_DB_USER,
   DB_PASSWORD: process.env.CYPRESS_DB_PASSWORD,
};

export default defineConfig({
   defaultCommandTimeout: 12000,
   responseTimeout: 60000,
   video: false,
   // Cypress 16 sends Chrome traffic through the browser's own network stack.
   // On CI (Chrome 157 headless) every cy.visit() then timed out waiting for
   // the page load event. Use the legacy HTTP/1.1 proxy path until we know why.
   // Deprecated in Cypress 16, so revisit before the next major.
   forceHttp1: true,
   // Cypress 16's 'modern' visibility check (checkVisibility()) broke 5
   // kitchen-sink tests on webix widgets (multicombo [x], form save,
   // process inbox) on two CI runs in a row. Keep the old algorithm for now.
   // Deprecated in Cypress 16, same as forceHttp1.
   visibilityStrategy: "legacy",
   expose,
   env,
   e2e: {
      baseUrl,
      setupNodeEvents(on, config) {
         on("task", {
            // Cypress 16 removed cy.exec(). Run shell commands here instead,
            // from the project root (same cwd cy.exec used).
            // Yields { code, stdout, stderr }; see shell() in support/commands.js
            shell(cmd) {
               const r = spawnSync("bash", ["-c", cmd], {
                  cwd: config.projectRoot,
                  env: process.env,
                  encoding: "utf8",
                  maxBuffer: 50 * 1024 * 1024,
               });
               return {
                  code: r.status ?? 1,
                  stdout: r.stdout || "",
                  stderr: r.stderr || (r.error ? String(r.error) : ""),
               };
            },
            listJsonDefs(dir) {
               const fullPath = path.resolve(dir);
               return fs
                  .readdirSync(fullPath)
                  .filter((f) => f.endsWith(".json"));
            },
         });
      },
   },
});

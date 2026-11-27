// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

/**
 * shell(cmd, { failOnNonZeroExit = true, log = true, timeout })
 * Cypress 16 replacement for cy.exec(): runs `cmd` with the "shell" task
 * (cypress.config.mjs) and yields { code, stdout, stderr }.
 */
function shell(cmd, options = {}) {
   const { failOnNonZeroExit = true, log = true, timeout = 60000 } = options;
   if (log) cy.log(`shell: ${cmd}`);
   return cy.task("shell", cmd, { log: false, timeout }).then((result) => {
      if (failOnNonZeroExit && result.code !== 0) {
         throw new Error(
            `shell command failed (exit ${result.code}): ${
               log ? cmd : "(hidden)"
            }\n${result.stderr}`,
         );
      }
      return result;
   });
}

Cypress.Commands.add("AuthLogin", () => {
   cy.session("admin", () => {
      const email = Cypress.expose("USER_EMAIL");
      cy.log(`Logging in as ${email}`);
      cy.env(["USER_PASSWORD"], { log: false }).then(({ USER_PASSWORD }) => {
         cy.request("POST", "/auth/login", {
            tenant: Cypress.expose("TENANT"),
            email,
            password: USER_PASSWORD,
         })
            .its("body")
            .as("currentUser");
      });
   });
});

Cypress.Commands.add("DCSetCursor", (idDC, idRow) => {
   cy.window().then((win) => {
      let AB = win.AB;
      if (AB) {
         return AB.datacollectionByID(idDC).setCursor(idRow);
         // Question: Do you have any Idea how to make this wait for
         // the DC to be initialized before continuing?
         // maybe something like:
         // let DC = AB.datacollectionByID(idDC);
         // if (DC.dataStatus == DC.dataStatusFlag.initialized) {
         //    return DC.setCursor(idRow);
         // }
         // let settingCursor = new Promise((done) => {
         //    DC.once("initializedData", ()=>{
         //       DC.setCursor(idRow);
         //       done();
         //    })
         // });
         // return cy.wrap(settingCursor);
      }
      return null;
   });
});

/**
 * helper for scrolling in a grid
 * @function gridScroll
 * @param {string} id webix id of the grid
 * @param {int} h horizontal scroll in pixels
 * @param {int=0} v veritcal scroll in pixels
 */
Cypress.Commands.add("GridScroll", (id, h, v = 0) => {
   cy.window().then((win) => {
      return win.$$(id).scrollTo(h, v);
   });
});

Cypress.Commands.add("ModelCreate", (ID, data) => {
   cy.window().then((win) => {
      let AB = win.AB;
      if (AB) {
         return AB.objectByID(ID).model().create(data);
      }
      return null;
   });
});

Cypress.Commands.add("ModelDelete", (idModel, idRow) => {
   cy.window().then((win) => {
      let AB = win.AB;
      if (AB) {
         return AB.objectByID(idModel).model().delete(idRow);
      }
      return null;
   });
});

Cypress.Commands.add("ModelFind", (idModel, cond) => {
   cy.window().then((win) => {
      let AB = win.AB;
      if (AB) {
         return AB.objectByID(idModel).model().findAll(cond);
      }
      return null;
   });
});

Cypress.Commands.add("ModelUpdate", (idModel, idRow, data) => {
   cy.window().then((win) => {
      let AB = win.AB;
      if (AB) {
         return AB.objectByID(idModel).model().update(idRow, data);
      }
      return null;
   });
});

Cypress.Commands.add("ResetDB", () => {
   const stack = Cypress.expose("STACK");

   // Clear Cypress saved sessions since DB is being wiped
   Cypress.session.clearAllSavedSessions();

   // Clear the Physical DB
   shell(`npm run test:reset ${stack}`, {
      failOnNonZeroExit: false,
      timeout: 300000,
   });

   // Have the running services clear their definitions.
   cy.request("POST", "/test/reset", { tenant: Cypress.expose("TENANT") });
});

// Exit codes the RunSQL script uses for setup errors. These always fail the
// test, even when `fail` is false (that only covers SQL errors).
const RUNSQL_NO_CONTAINER = 97;
const RUNSQL_MISSING_FILE = 98;

/**
 * RunSQL(folder, files, fail = true)
 * Pipes the given SQL files from cypress/e2e/<folder>/test_setup/sql/ into
 * mysql in the <stack>_db container. One shell call, no temp files.
 */
Cypress.Commands.add("RunSQL", (folder, files, fail = true) => {
   const stack = Cypress.expose("STACK");
   if (typeof files === "string") {
      files = [files];
   }
   const paths = files
      .map((file) => `./cypress/e2e/${folder}/test_setup/sql/${file}`)
      .join(" ");
   // single-quote for bash
   const q = (v) => `'${String(v ?? "").replace(/'/g, `'\\''`)}'`;

   cy.log(`RunSQL ${folder}: ${files.join(", ")}`);
   cy.env(["DB_USER", "DB_PASSWORD"], { log: false }).then(
      ({ DB_USER: user, DB_PASSWORD: password }) => {
         const cmd = [
            "set -o pipefail",
            `for f in ${paths}; do [ -f "$f" ] || { echo "missing SQL file: $f" >&2; exit ${RUNSQL_MISSING_FILE}; }; done`,
            `id=$(docker ps -qf name=${stack}_db | head -1)`,
            `[ -n "$id" ] || { echo "couldn't find process matching '${stack}_db'" >&2; exit ${RUNSQL_NO_CONTAINER}; }`,
            `cat ${paths} | docker exec -i -e MYSQL_PWD=${q(
               password,
            )} "$id" mysql -u ${q(user)} appbuilder-admin`,
         ].join("\n");

         shell(cmd, { failOnNonZeroExit: false, log: false }).then(
            ({ code, stderr }) => {
               const setupError =
                  code === RUNSQL_NO_CONTAINER || code === RUNSQL_MISSING_FILE;
               if (code !== 0 && (fail || setupError)) {
                  throw new Error(`RunSQL failed (exit ${code}):\n${stderr}`);
               }
               if (code !== 0) cy.log(`RunSQL ignored error: ${stderr}`);
            },
         );
      },
   );
});

Cypress.Commands.add("TestLog", (log) => {
   // Have the running services clear their definitions.
   cy.request("POST", "/testlog", { log });
});

Cypress.Commands.add("VersionCheck", () => {
   // have our Services report back their current versions.
   cy.request("GET", "/versioncheck", { tenant: Cypress.expose("TENANT") });
});

/*
 * folder: test dir,  ex: 'kitchen_sink'
 * Expecting json in:
 * `test_setup/defs`
 */
Cypress.Commands.add("ImportAllDefs", (folder, fail = true) => {
   cy.task("listJsonDefs", `cypress/e2e/${folder}/test_setup/defs`).then(
      (files) => {
         files.forEach((file) => {
            cy.request("POST", "/test/import", {
               file: `imports/${folder}/test_setup/defs/${file}`,
            });
         });
      },
   );
});

// Use `cy.dataCy` custom command for more robust tests
// See https://docs.cypress.io/guides/references/best-practices.html#Selecting-Elements

import { cancelCreate, cancelEdit, checkRowHp, clearTable, isTableEmpty, openDialog, saveCreate, saveEdit, slug, tableRowExists, getFrame, getFrames } from "./shared.cy";

// ** This file is an example of how to write Cypress tests, you can safely delete it **



// This test will pass when run against a clean Quasar project
const count = 3;
describe('Multiple Heroes Pages/CRUD', () => {
  beforeEach(() => {
    cy.visit(`/#/multi/${count}/heroes`);
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait((count * 1500) + 2000)
  });

  it('.should() - the table would be empty', { retries: 3 }, () => {
    getFrame(() => clearTable())
    getFrames(() => isTableEmpty())
  });

  it('.should() - open and creation dialog and close it', { retries: 3 }, () => {
    getFrame((frame) => {
      return openDialog({
        selector: '.phl__create', 
        subject: frame,
        fn () {
          cancelCreate()
        }
      })
    })
    getFrames(() => isTableEmpty())
  });

  it('.should() - open and creation dialog and create a new hero', { retries: 3 }, () => {
    getFrame((frame) => {
      openDialog({
        selector: '.phl__create', 
        subject: frame,
        fn() {
          saveCreate(frame)
        }
      })
    })
    getFrames(() => tableRowExists(slug))
  });

  it('.should() - open and edit dialog for the Boba Feet and close it', { retries: 3 }, () => {
    const action =  `.phl__actions[data-slug="${slug}"] .phl__edit`
    getFrame((frame) => {
      tableRowExists(slug);
      openDialog({
        selector: action, 
        subject: frame,
        fn (){
          cancelEdit()
        }
      });
    })
    getFrames(() => tableRowExists(slug))
  });

  it('.should() - open and edit dialog for the Boba Feet and reduce the hp to 90', { retries: 3 }, () => {
    const newHp = 90
    const action =  `.phl__actions[data-slug="${slug}"] .phl__edit`
    getFrame((frame) => {
      checkRowHp(slug, 100)
      openDialog({
        selector: action,
        subject: frame,
        fn() {
          saveEdit(newHp)
        }
      })
    })
    getFrames(() => checkRowHp(slug, newHp))
  });

  it('.should() - redo the table would be empty', { retries: 3 }, () => {
    getFrame(() => clearTable())
    getFrames(() => isTableEmpty())
  });
});

 
// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {};

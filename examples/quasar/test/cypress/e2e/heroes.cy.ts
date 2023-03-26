// Use `cy.dataCy` custom command for more robust tests
// See https://docs.cypress.io/guides/references/best-practices.html#Selecting-Elements

// ** This file is an example of how to write Cypress tests, you can safely delete it **

import {
  cancelCreate,
  cancelEdit,
  checkRowHp,
  clearTable,
  isTableEmpty,
  openDialog,
  saveCreate,
  saveEdit,
  slug,
  tableRowExists,
} from './shared';

// This test will pass when run against a clean Quasar project

describe('Heroes CRUD - Single Page', () => {
  beforeEach(() => {
    cy.visit('/#/heroes');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
  });

  it('.should() - the table would be empty', { retries: 3 }, () => {
    clearTable();
    isTableEmpty();
  });

  it(
    '.should() - open and creation dialog and close it',
    { retries: 3 },
    () => {
      openDialog({
        selector: '.phl__create',
        fn() {
          cancelCreate();
        },
      });
      isTableEmpty();
    }
  );

  it(
    '.should() - open and creation dialog and create a new hero',
    { retries: 3 },
    () => {
      openDialog({
        selector: '.phl__create',
        fn() {
          saveCreate();
        },
      });
      tableRowExists(slug);
    }
  );

  it(
    '.should() - open and edit dialog for the Boba Feet and close it',
    { retries: 3 },
    () => {
      const action = `.phl__actions[data-slug="${slug}"] .phl__edit`;
      tableRowExists(slug);
      openDialog({
        selector: action,
        fn() {
          cancelEdit();
        },
      });
    }
  );

  it(
    '.should() - open and edit dialog for the Boba Feet and reduce the hp to 90',
    { retries: 3 },
    () => {
      const newHp = 90;
      const action = `.phl__actions[data-slug="${slug}"] .phl__edit`;
      checkRowHp(slug, 100);
      openDialog({
        selector: action,
        fn() {
          saveEdit(newHp);
        },
      });
      tableRowExists(slug);
      checkRowHp(slug, newHp);
    }
  );

  it('.should() - redo the table would be empty', { retries: 3 }, () => {
    clearTable();
    isTableEmpty();
  });
});

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {};

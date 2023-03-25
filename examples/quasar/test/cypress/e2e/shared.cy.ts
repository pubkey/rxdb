// Use `cy.dataCy` custom command for more robust tests
// See https://docs.cypress.io/guides/references/best-practices.html#Selecting-Elements

import { uid } from "quasar";

// ** This file is an example of how to write Cypress tests, you can safely delete it **

export const slug = 'boba-fett'
export function clearTable() {
  cy.get('.phl__table').within((tbl) => {
    if (tbl.find('.phl__actions').length) {
      return cy.get('.phl__actions').each(() => {
        cy.get('.phl__remove').click();
      });
    }
  })
}

export function isTableEmpty() {
  cy.get('.phl__table .q-table__bottom--nodata')
    .should('contain', 'No data available');
}


type HtmlSubject = HTMLElement | JQuery<HTMLElement>;
const defaultSubject: HtmlSubject = Cypress.$('body')
function withinDialog (ctx: { selector?: string, subject?: HtmlSubject, fn: DialogCb }) {
  return withinPortal(ctx).then($el => {
      cy.wrap($el).should('not.exist');
    })
}

function withinPortal ({ selector = '.q-dialog', subject = defaultSubject, fn }: { selector?: string, subject?: HtmlSubject, fn: DialogCb }) {
  return cy.get(selector, { withinSubject: subject })
    .should('have.length', 1)
    .within(fn as never)
}

type DialogCb = Parameters<typeof cy.withinDialog>[0]
export function openDialog({ selector, subject, fn }: { selector: string, fn: DialogCb, subject?: HtmlSubject }) {
  cy.get(selector).first().click();
  return withinDialog({
    fn,
    subject
  })
}

type PortalCb = Parameters<typeof cy.withinPortal>[1]
export function openPortal({ selector, subject, fn }: { selector: string, fn: PortalCb, subject?: HtmlSubject }) {
  return withinPortal({
    selector,
    fn,
    subject
  })
}

export function cancelCreate() {
  cy.get('.phc__card').should('exist');
  cy.get('.phc__close').first().click();
}

export function pickColor({ selector, rgb, subject }: { selector: string, rgb: number[], subject?: HtmlSubject }) {
  cy.get(`${selector} .crci__opener`).click();
  openPortal({
    selector: '.crci__picker', 
    subject, 
    fn () {
      cy.get('.q-color-picker__footer .q-tab').eq(1).click();
      cy.get('.q-color-picker__tune-tab').within(() => {
        cy.get('input').eq(0).type('' + rgb[0])
        cy.get('input').eq(1).type('' + rgb[1])
        cy.get('input').eq(2).type('' + rgb[2])
      })
      cy.get('div').first().type('{esc}')
    }
  })
}

export function saveCreate(subject?: HtmlSubject) {
  cy.get('.phc__card').should('exist');
  cy.get('.phc__name input').type('Boba Fett');
  pickColor({
    selector: '.phc__color', 
    subject,
    rgb: [124, 189, 196]
  });
  cy.get('.phc__save').first().click();
}

export function tableRowExists(slug: string) {
  cy.get(`.phl__table .phl__actions[data-slug="${slug}"]`).should('exist');
}

export function checkRowHp(slug: string, hp: number) {
  cy.get(`.phl__table .phl__actions[data-slug="${slug}"]`).parent().get('td').eq(2).should('contain', '' + hp);
}

export function cancelEdit() {
  cy.get('.phe__card').should('exist');
  cy.get('.phe__close').first().click();
}

export function saveEdit(hp: number) {
  cy.get('.phe__card').should('exist');
  cy.get('.phe__hp input').clear().type('' + hp);
  cy.get('.phe__save').first().click();
}

export function getFrames (frameCb: (subject: unknown) => void) {
  cy.get('.pma__card').each(() => {
    cy
      .get('.pma__frame')
      .its('0.contentDocument.body').should('not.be.empty')
      .then(cy.wrap)
      .within(frameCb)
  })
}

export function getFrame (frameCb: (subject: HtmlSubject) => void) {
  cy.get('.pma__card').first()
    .get('.pma__frame')
    .its('0.contentDocument.body').should('not.be.empty')
    .then(cy.wrap)
    .within(frameCb as never);
}
 
// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {};


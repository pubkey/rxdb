export const NON_PREMIUM_COLLECTION_LIMIT = 13;

/**
 * Descriptive page title for the two pages that stand alone in search results
 * and have no parent topic to give them context: the homepage and /consulting/.
 * Everywhere else the page sets its own topical title and Docusaurus appends
 * ` | RxDB` from the `title` in docusaurus.config.ts.
 */
export const HOME_TITLE = 'RxDB - JavaScript Database';

/**
 * Title of the /jobs/ page. Like HOME_TITLE it already names the brand, so the
 * swizzled TitleFormatter must not append the ` | RxDB` suffix to it.
 */
export const JOBS_TITLE = 'Jobs & Stellenangebote bei RxDB';

/**
 * Premium tier prices in dollars per month, billed annually.
 * Shown on the premium page and used to calculate
 * the lead value on the premium-submitted pages.
 */
export const PRICE_PRO_MONTHLY = 99;
export const PRICE_PRO_PLUS_MONTHLY = 239;

/**
 * Client-side, request-free detection of visitors that are likely located
 * in the EU/EEA (plus the UK). Used to decide whether the cookie consent
 * banner has to be shown at all.
 *
 * There is no reliable way to read the visitor IP on a static site
 * (rxdb.info is hosted on GitHub Pages, so there is no edge geo header).
 * The browser timezone is the only geo signal that is available without a
 * network request and without sending any personal data to a third party.
 * It is a heuristic (a VPN or a traveler defeats it), so we err on the safe
 * side and show the banner whenever detection fails.
 */

/**
 * ISO 3166-1 alpha-2 codes of the EU + EEA countries (and the UK for
 * UK-GDPR). Passed to Google Consent Mode as the `region` so that Google
 * applies the "denied" default only to these regions, using the accurate
 * server-side IP lookup at its own edge.
 */
export const EU_EEA_REGION_CODES: string[] = [
    // EU 27
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE',
    // EEA (non-EU)
    'IS', 'LI', 'NO',
    // United Kingdom (UK-GDPR)
    'GB',
];

/**
 * IANA timezones that map to an EU/EEA (or UK) country. Used to decide
 * whether the banner is shown in the browser.
 */
const EU_EEA_TIMEZONES: Set<string> = new Set([
    // EU 27
    'Europe/Vienna',        // AT
    'Europe/Brussels',      // BE
    'Europe/Sofia',         // BG
    'Europe/Zagreb',        // HR
    'Asia/Famagusta',       // CY
    'Asia/Nicosia',         // CY
    'Europe/Prague',        // CZ
    'Europe/Copenhagen',    // DK
    'Europe/Tallinn',       // EE
    'Europe/Helsinki',      // FI
    'Europe/Paris',         // FR
    'Europe/Berlin',        // DE
    'Europe/Busingen',      // DE
    'Europe/Athens',        // GR
    'Europe/Budapest',      // HU
    'Europe/Dublin',        // IE
    'Europe/Rome',          // IT
    'Europe/Riga',          // LV
    'Europe/Vilnius',       // LT
    'Europe/Luxembourg',    // LU
    'Europe/Malta',         // MT
    'Europe/Amsterdam',     // NL
    'Europe/Warsaw',        // PL
    'Europe/Lisbon',        // PT
    'Atlantic/Azores',      // PT
    'Atlantic/Madeira',     // PT
    'Europe/Bucharest',     // RO
    'Europe/Bratislava',    // SK
    'Europe/Ljubljana',     // SI
    'Europe/Madrid',        // ES
    'Atlantic/Canary',      // ES
    'Europe/Stockholm',     // SE
    // EEA (non-EU)
    'Europe/Oslo',          // NO
    'Atlantic/Reykjavik',   // IS
    'Europe/Vaduz',         // LI
    // United Kingdom (UK-GDPR)
    'Europe/London',        // GB
]);

/**
 * Returns true when the visitor is likely located in the EU/EEA (or UK),
 * based purely on the browser timezone. Returns true (show the banner) when
 * detection is not possible, so we never accidentally track an EU visitor
 * without consent.
 */
export function isLikelyEuUser(): boolean {
    try {
        if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
            return true;
        }
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timezone) {
            return true;
        }
        return EU_EEA_TIMEZONES.has(timezone);
    } catch (err) {
        return true;
    }
}

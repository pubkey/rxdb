/**
 * Adds a released RxDB version to the RxDB item on Wikidata.
 * Creates a "software version identifier" (P348) statement with
 * publication date, version type "stable version" and the npm page as reference,
 * marks it as preferred and downgrades the previously preferred version to normal rank.
 * Does nothing if the version is already on the item.
 *
 * Usage:
 *   WIKIDATA_USERNAME=... WIKIDATA_PASSWORD=... node scripts/wikidata-add-version.mjs 17.7.0
 *   node scripts/wikidata-add-version.mjs 17.7.0 --dry-run
 *
 * WIKIDATA_USERNAME / WIKIDATA_PASSWORD are a bot password
 * created at https://www.wikidata.org/wiki/Special:BotPasswords
 *
 * @link https://www.wikidata.org/wiki/Q141663707
 * @link https://www.mediawiki.org/wiki/API:Login
 * @link https://www.wikidata.org/w/api.php?action=help&modules=wbsetclaim
 */
import { randomUUID } from 'crypto';

const ITEM_ID = 'Q141663707';
const API_URL = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'RxDB-release-bot/1.0 (https://github.com/pubkey/rxdb)';

const PROPERTY_VERSION = 'P348';
const PROPERTY_PUBLICATION_DATE = 'P577';
const PROPERTY_VERSION_TYPE = 'P548';
const PROPERTY_REFERENCE_URL = 'P854';
const PROPERTY_RETRIEVED = 'P813';
const ITEM_STABLE_VERSION = 'Q2804309';

const version = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('wikidata-add-version: first argument must be a stable version like 17.7.0, got: ' + version);
}

const cookies = new Map();

async function apiRequest(params, method = 'GET') {
    const body = new URLSearchParams(Object.assign({ format: 'json', formatversion: '2' }, params));
    const url = method === 'GET' ? API_URL + '?' + body.toString() : API_URL;
    const response = await fetch(url, {
        method,
        headers: {
            'User-Agent': USER_AGENT,
            'Cookie': Array.from(cookies.entries()).map(([k, v]) => k + '=' + v).join('; '),
            ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
        },
        body: method === 'POST' ? body.toString() : undefined
    });
    for (const setCookie of response.headers.getSetCookie()) {
        const [pair] = setCookie.split(';');
        const index = pair.indexOf('=');
        cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const text = await response.text();
    if (!response.ok) {
        throw new Error('wikidata-add-version: HTTP ' + response.status + ': ' + text.slice(0, 500));
    }
    const json = JSON.parse(text);
    if (json.error) {
        throw new Error('wikidata-add-version: API error: ' + JSON.stringify(json.error));
    }
    return json;
}

async function login() {
    const username = process.env.WIKIDATA_USERNAME;
    const password = process.env.WIKIDATA_PASSWORD;
    if (!username || !password) {
        throw new Error('wikidata-add-version: WIKIDATA_USERNAME and WIKIDATA_PASSWORD must be set');
    }
    const tokenResponse = await apiRequest({ action: 'query', meta: 'tokens', type: 'login' });
    const loginResponse = await apiRequest({
        action: 'login',
        lgname: username,
        lgpassword: password,
        lgtoken: tokenResponse.query.tokens.logintoken
    }, 'POST');
    if (loginResponse.login.result !== 'Success') {
        throw new Error('wikidata-add-version: login failed: ' + JSON.stringify(loginResponse.login));
    }
    const csrfResponse = await apiRequest({ action: 'query', meta: 'tokens', type: 'csrf' });
    return csrfResponse.query.tokens.csrftoken;
}

async function getVersionClaims() {
    if (dryRun) {
        // read the public entity dump, does not need a login and is not rate limited like the api
        const response = await fetch('https://www.wikidata.org/wiki/Special:EntityData/' + ITEM_ID + '.json', {
            headers: { 'User-Agent': USER_AGENT }
        });
        const entityData = await response.json();
        return entityData.entities[ITEM_ID].claims[PROPERTY_VERSION] || [];
    }
    const json = await apiRequest({ action: 'wbgetentities', ids: ITEM_ID, props: 'claims' });
    return json.entities[ITEM_ID].claims[PROPERTY_VERSION] || [];
}

function timeValue(date) {
    return {
        time: '+' + date.toISOString().slice(0, 10) + 'T00:00:00Z',
        timezone: 0,
        before: 0,
        after: 0,
        precision: 11,
        calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
    };
}

function snak(property, datatype, datavalue) {
    return { snaktype: 'value', property, datatype, datavalue };
}

function buildVersionClaim() {
    const today = timeValue(new Date());
    return {
        id: ITEM_ID + '$' + randomUUID(),
        type: 'statement',
        rank: 'preferred',
        mainsnak: snak(PROPERTY_VERSION, 'string', { type: 'string', value: version }),
        qualifiers: {
            [PROPERTY_PUBLICATION_DATE]: [snak(PROPERTY_PUBLICATION_DATE, 'time', { type: 'time', value: today })],
            [PROPERTY_VERSION_TYPE]: [snak(PROPERTY_VERSION_TYPE, 'wikibase-item', {
                type: 'wikibase-entityid',
                value: { 'entity-type': 'item', 'numeric-id': Number(ITEM_STABLE_VERSION.slice(1)), id: ITEM_STABLE_VERSION }
            })]
        },
        'qualifiers-order': [PROPERTY_PUBLICATION_DATE, PROPERTY_VERSION_TYPE],
        references: [{
            snaks: {
                [PROPERTY_REFERENCE_URL]: [snak(PROPERTY_REFERENCE_URL, 'url', {
                    type: 'string',
                    value: 'https://www.npmjs.com/package/rxdb/v/' + version
                })],
                [PROPERTY_RETRIEVED]: [snak(PROPERTY_RETRIEVED, 'time', { type: 'time', value: today })]
            },
            'snaks-order': [PROPERTY_REFERENCE_URL, PROPERTY_RETRIEVED]
        }]
    };
}

async function setClaim(csrfToken, claim, summary) {
    if (dryRun) {
        console.log('wikidata-add-version: [dry-run] would save claim: ' + summary);
        console.log(JSON.stringify(claim, null, 2));
        return;
    }
    await apiRequest({
        action: 'wbsetclaim',
        claim: JSON.stringify(claim),
        summary,
        token: csrfToken,
        assert: 'user',
        maxlag: '5'
    }, 'POST');
    console.log('wikidata-add-version: saved claim: ' + summary);
}

async function run() {
    const csrfToken = dryRun ? '' : await login();
    const existingClaims = await getVersionClaims();

    if (existingClaims.some(claim => claim.mainsnak.datavalue?.value === version)) {
        console.log('wikidata-add-version: version ' + version + ' is already on ' + ITEM_ID + ', nothing to do');
        return;
    }

    await setClaim(csrfToken, buildVersionClaim(), 'Add RxDB release ' + version);

    for (const claim of existingClaims.filter(c => c.rank === 'preferred')) {
        const downgraded = Object.assign({}, claim, { rank: 'normal' });
        await setClaim(
            csrfToken,
            downgraded,
            'Set rank of previous RxDB version ' + claim.mainsnak.datavalue?.value + ' to normal'
        );
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

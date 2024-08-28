

/**
 * this file is similar to the one of core-js
 * So you can disable the output-spam with the same params
 * and we also have the same colors
 * @link https://github.com/zloirock/core-js/blob/381c366b8cdc84050bb0ef7184a6e80f45bf5903/packages/core-js/scripts/postinstall.js
 * @link https://github.com/opencollective/opencollective-postinstall/blob/master/index.js
 */

const env = process.env;
const ADBLOCK = is(env.ADBLOCK);
const CI = is(env.CI);
const COLOR = is(env.npm_config_color);
const DISABLE_OPENCOLLECTIVE = is(env.DISABLE_OPENCOLLECTIVE);
const SILENT = !!~['silent', 'error', 'warn'].indexOf(env.npm_config_loglevel);
const SHOW = false;

function is(it) {
    return !!it && it !== '0' && it !== 'false';
}

function log(it) {
    // eslint-disable-next-line no-control-regex
    console.log(COLOR ? it : it.replace(/\u001B\[\d+m/g, ''));
}

if (SHOW && !ADBLOCK && !CI && !DISABLE_OPENCOLLECTIVE && !SILENT) {
    log('\u001b[96m\u001b[1mThank you for using RxDB ( https://rxdb.info/ ) \u001b[96m\u001b[1m \n');
    log('\u001B[96mHelp me to improve RxDB by answering a few questions ( < 2 minutes): \u001B[0m');
    log('\u001B[96m>\u001B[94m Open the survey at https://rxdb.info/survey.html \u001B[0m');
    log('\u001b[96m\u001b[1mThank you \u001b[96m\u001b[1m \n');
}

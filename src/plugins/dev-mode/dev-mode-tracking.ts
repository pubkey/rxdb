import { isRxDatabaseFirstTimeInstantiated } from '../../rx-database.ts';
import type { RxDatabase } from '../../types';
import {
    PREMIUM_FLAG_HASH,
    RXDB_UTILS_GLOBAL,
    RXDB_VERSION,
    defaultHashSha256
} from '../utils/index.ts';


let iframeShown = false;


/**
 * Adds an iframe to track the results of marketing efforts.
 */
export async function addDevModeTrackingIframe(db: RxDatabase) {
    /**
     * Only run this in browser AND localhost AND dev-mode.
     * Make sure this is never used in production by someone.
     */
    if (
        iframeShown ||
        typeof window === 'undefined' ||
        typeof location === 'undefined' ||
        !isLocalHost()
    ) {
        return;
    }


    // do not show if premium flag is set.
    if (
        RXDB_UTILS_GLOBAL.premium &&
        typeof RXDB_UTILS_GLOBAL.premium === 'string' &&
        (await defaultHashSha256(RXDB_UTILS_GLOBAL.premium) === PREMIUM_FLAG_HASH)
    ) {
        return;
    }


    // Only run if db was created for the first time.
    const isFirstTime = await isRxDatabaseFirstTimeInstantiated(db);
    if (!isFirstTime) {
        return;
    }

    iframeShown = true;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'https://rxdb.info/html/dev-mode-iframe.html?version=' + RXDB_VERSION;
    document.body.appendChild(iframe);
}


function isLocalHost() {
    return (
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        location.hostname === '0.0.0.0' ||
        location.hostname === '[::1]'  // IPv6
    );
}

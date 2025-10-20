import type { RxDatabase } from '../../types';
import {
    RXDB_VERSION,
    hasPremiumFlag,
    hashStringToNumber
} from '../utils/index.ts';


let iframeShown = false;

const links: {
    text: string;
    url: string;
}[] = [
        {
            text: 'JavaScript Database',
            url: 'https://rxdb.info/'
        },
        {
            text: 'React Native Database',
            url: 'https://rxdb.info/react-native-database.html'
        },
        {
            text: 'Local First',
            url: 'https://rxdb.info/articles/local-first-future.html'
        },
        {
            text: 'Angular IndexedDB',
            url: 'https://rxdb.info/articles/angular-indexeddb.html'
        },
        {
            text: 'React IndexedDB',
            url: 'https://rxdb.info/articles/react-indexeddb.html'
        },
        {
            text: 'Firestore Alternative',
            url: 'https://rxdb.info/articles/firestore-alternative.html'
        },
        {
            text: 'Offline Database',
            url: 'https://rxdb.info/articles/offline-database.html'
        },
        {
            text: 'JSON Database',
            url: 'https://rxdb.info/articles/json-database.html'
        },
        {
            text: 'NodeJS Database',
            url: 'https://rxdb.info/nodejs-database.html'
        }
    ];


/**
 * Adds an iframe to track the results of marketing efforts.
 */
export async function addDevModeTrackingIframe() {
    /**
     * Only run this in browser AND localhost AND dev-mode.
     * Make sure this is never used in production by someone.
     */
    if (
        iframeShown ||
        typeof window === 'undefined' ||
        typeof location === 'undefined' ||
        typeof document === 'undefined'
        // !isLocalHost()
    ) {
        return;
    }


    // do not show if premium flag is set.
    if (await hasPremiumFlag()) {
        return;
    }

    iframeShown = true;

    /**
     * Do not use display:none
     * @link https://medium.com/@zachcaceres/dont-use-display-none-to-hide-iframes-in-safari-b51715eb22c4
     */
    const containerDiv = document.createElement('div');
    containerDiv.style.visibility = 'hidden';
    containerDiv.style.position = 'absolute';
    containerDiv.style.top = '0';
    containerDiv.style.left = '0';
    containerDiv.style.opacity = '0.1';
    containerDiv.style.width = '1px';
    containerDiv.style.height = '1px';
    containerDiv.style.overflow = 'hidden';

    const iframe = document.createElement('iframe');
    iframe.width = '1px';
    iframe.height = '1px';
    iframe.src = 'https://rxdb.info/html/dev-mode-iframe.html?version=' + RXDB_VERSION;
    containerDiv.appendChild(iframe);

    const hashNr = hashStringToNumber(location.host);
    const useLinkId = hashNr % links.length;
    const useLink = links[useLinkId];
    const link = document.createElement('a');
    link.href = useLink.url;
    link.target = '_blank';
    link.innerText = useLink.text;

    const p = document.createElement('p');
    p.innerText = 'This is the iframe which is shown when the RxDB Dev-Mode is enabled. Also see ';
    p.appendChild(link);
    containerDiv.appendChild(p);

    document.body.appendChild(containerDiv);
}


function isLocalHost() {
    return (
        location.hostname === 'localhost' ||
        location.hostname.includes('localhost') ||
        location.hostname === '127.0.0.1' ||
        location.hostname === '0.0.0.0' ||
        location.hostname === '[::1]'  // IPv6
    );
}

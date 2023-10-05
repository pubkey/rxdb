const COUCH_NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz';
/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
export function randomCouchString(length: number = 10): string {
    let text = '';

    for (let i = 0; i < length; i++) {
        text += COUCH_NAME_CHARS.charAt(Math.floor(Math.random() * COUCH_NAME_CHARS.length));
    }

    return text;
}


/**
 * A random string that is never inside of any storage
 */
export const RANDOM_STRING = 'Fz7SZXPmYJujkzjY1rpXWvlWBqoGAfAX';

/**
 * uppercase first char
 */
export function ucfirst(str: string): string {
    str += '';
    const f = str.charAt(0)
        .toUpperCase();
    return f + str.substr(1);
}

/**
 * removes trailing and ending dots from the string
 */
export function trimDots(str: string): string {
    // start
    while (str.charAt(0) === '.') {
        str = str.substr(1);
    }

    // end
    while (str.slice(-1) === '.') {
        str = str.slice(0, -1);
    }

    return str;
}

/**
 * @link https://stackoverflow.com/a/44950500/3443137
 */
export function lastCharOfString(str: string): string {
    return str.charAt(str.length - 1);
}

/**
 * returns true if the given name is likely a folder path
 */
export function isFolderPath(name: string) {
    // do not check, if foldername is given
    if (
        name.includes('/') || // unix
        name.includes('\\') // windows
    ) {
        return true;
    } else {
        return false;
    }
}


/**
 * @link https://gist.github.com/andreburgaud/6f73fd2d690b629346b8
 */
export function arrayBufferToString(buf: ArrayBuffer): string {
    return String.fromCharCode.apply(null, new Uint16Array(buf) as any);
}

export function stringToArrayBuffer(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length * 2);
    const bufView = new Uint16Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

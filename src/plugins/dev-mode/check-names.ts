import { newRxError, newRxTypeError } from '../../rx-error';
import { isFolderPath } from '../../util';

const validCouchDBStringRegexStr = '^[a-z][_$a-z0-9\\-]*$';
const validCouchDBStringRegex = new RegExp(validCouchDBStringRegexStr);

/**
 * Validates that a given string is ok to be used with couchdb-collection-names.
 * We only allow these strings as database- or collection names because it ensures
 * that you later do not get in troubble when you want to use the database together witch couchdb.
 *
 * @link https://docs.couchdb.org/en/stable/api/database/common.html
 * @link https://neighbourhood.ie/blog/2020/10/13/everything-you-need-to-know-about-couchdb-database-names/
 * @throws  {Error}
 */
export function validateDatabaseName(name: string): true {
    if (
        typeof name !== 'string' ||
        name.length === 0
    ) {
        throw newRxTypeError('UT1', {
            name
        });
    }


    // do not check, if foldername is given
    if (isFolderPath(name)) {
        return true;
    }


    if (!name.match(validCouchDBStringRegex)) {
        throw newRxError('UT2', {
            regex: validCouchDBStringRegexStr,
            givenName: name,
        });
    }

    return true;
}

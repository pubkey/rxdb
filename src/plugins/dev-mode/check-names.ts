import { newRxError, newRxTypeError } from '../../rx-error';
import { isFolderPath } from '../../util';

const validCouchDBStringRegexStr = '^[a-z][_$a-z0-9]*$';
const validCouchDBStringRegex = new RegExp(validCouchDBStringRegexStr);

/**
 * Validates that a given string is ok to be used with couchdb-collection-names.
 * We only allow these strings as database- or collectionnames because it ensures
 * that you later do not get in troubble when you want to use the database together witch couchdb.
 *
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
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

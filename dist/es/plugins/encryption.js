/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import { newRxTypeError, newRxError } from '../rx-error';
import objectPath from 'object-path';
import { clone, createRevision, ensureNotFalsy, flatClone, getDefaultRevision, hash, now, PROMISE_RESOLVE_FALSE } from '../util';
import { writeSingle } from '../rx-storage-helper';
import { getPrimaryKeyOfInternalDocument, INTERNAL_CONTEXT_ENCRYPTION } from '../rx-database-internal-store';

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

export var storePasswordHashIntoDatabase = function storePasswordHashIntoDatabase(rxDatabase) {
  try {
    var _temp3 = function _temp3(_result) {
      if (_exit2) return _result;

      if (pwHash !== pwHashDoc.data.hash) {
        // different hash was already set by other instance
        return Promise.resolve(rxDatabase.destroy()).then(function () {
          throw newRxError('DB1', {
            passwordHash: hash(rxDatabase.password),
            existingPasswordHash: pwHashDoc.data.hash
          });
        });
      } else {
        return true;
      }
    };

    var _exit2 = false;

    if (!rxDatabase.password) {
      return Promise.resolve(PROMISE_RESOLVE_FALSE);
    }

    var pwHash = hash(rxDatabase.password);
    var pwHashDocumentKey = 'pwHash';
    var pwHashDocumentId = getPrimaryKeyOfInternalDocument(pwHashDocumentKey, INTERNAL_CONTEXT_ENCRYPTION);
    var docData = {
      id: pwHashDocumentId,
      key: pwHashDocumentKey,
      context: INTERNAL_CONTEXT_ENCRYPTION,
      data: {
        hash: pwHash
      },
      _deleted: false,
      _attachments: {},
      _meta: {
        lwt: now()
      },
      _rev: getDefaultRevision()
    };
    docData._rev = createRevision(docData);
    var pwHashDoc;

    var _temp4 = _catch(function () {
      return Promise.resolve(writeSingle(rxDatabase.internalStore, {
        document: docData
      })).then(function (_writeSingle) {
        pwHashDoc = _writeSingle;
      });
    }, function (err) {
      if (err.isError && err.status === 409) {
        pwHashDoc = ensureNotFalsy(err.documentInDb);
      } else {
        throw err;
      }
    });

    return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
  } catch (e) {
    return Promise.reject(e);
  }
};
export var MINIMUM_PASSWORD_LENGTH = 8;
export function encryptString(value, password) {
  var encrypted = AES.encrypt(value, password);
  return encrypted.toString();
}
export function decryptString(cipherText, password) {
  /**
   * Trying to decrypt non-strings
   * will cause no errors and will be hard to debug.
   * So instead we do this check here.
   */
  if (typeof cipherText !== 'string') {
    throw newRxError('SNH', {
      args: {
        cipherText: cipherText
      }
    });
  }

  var decrypted = AES.decrypt(cipherText, password);
  var ret = decrypted.toString(cryptoEnc);
  return ret;
}

function cloneWithoutAttachments(data) {
  var attachments = data._attachments;
  data = flatClone(data);
  delete data._attachments;
  data = clone(data);
  data._attachments = attachments;
  return data;
}

export var RxDBEncryptionPlugin = {
  name: 'encryption',
  rxdb: true,
  prototypes: {},
  overwritable: {
    validatePassword: function validatePassword(password) {
      if (password && typeof password !== 'string') {
        throw newRxTypeError('EN1', {
          password: password
        });
      }

      if (password && password.length < MINIMUM_PASSWORD_LENGTH) {
        throw newRxError('EN2', {
          minPassLength: MINIMUM_PASSWORD_LENGTH,
          password: password
        });
      }
    }
  },
  hooks: {
    createRxDatabase: {
      after: function after(args) {
        return storePasswordHashIntoDatabase(args.database);
      }
    },
    preWriteToStorageInstance: {
      before: function before(args) {
        var password = args.database.password;
        var schema = args.schema;

        if (!password || !schema.encrypted || schema.encrypted.length === 0) {
          return;
        }

        var docData = cloneWithoutAttachments(args.doc);
        schema.encrypted.forEach(function (path) {
          var value = objectPath.get(docData, path);

          if (typeof value === 'undefined') {
            return;
          }

          var stringValue = JSON.stringify(value);
          var encrypted = encryptString(stringValue, password);
          objectPath.set(docData, path, encrypted);
        });
        args.doc = docData;
      }
    },
    postReadFromInstance: {
      after: function after(args) {
        var password = args.database.password;
        var schema = args.schema;

        if (!password || !schema.encrypted || schema.encrypted.length === 0) {
          return;
        }

        var docData = cloneWithoutAttachments(args.doc);
        schema.encrypted.forEach(function (path) {
          var value = objectPath.get(docData, path);

          if (typeof value === 'undefined') {
            return;
          }

          var decrypted = decryptString(value, password);
          var decryptedParsed = JSON.parse(decrypted);
          objectPath.set(docData, path, decryptedParsed);
        });
        args.doc = docData;
      }
    },
    preWriteAttachment: {
      after: function (args) {
        try {
          var password = args.database.password;
          var schema = args.schema;

          if (password && schema.attachments && schema.attachments.encrypted) {
            var dataString = args.attachmentData.data;
            var encrypted = encryptString(dataString, password);
            args.attachmentData.data = encrypted;
          }

          return Promise.resolve();
        } catch (e) {
          return Promise.reject(e);
        }
      }
    },
    postReadAttachment: {
      after: function (args) {
        try {
          var password = args.database.password;
          var schema = args.schema;

          if (password && schema.attachments && schema.attachments.encrypted) {
            var dataString = args.plainData;
            var decrypted = decryptString(dataString, password);
            args.plainData = decrypted;
          }

          return Promise.resolve();
        } catch (e) {
          return Promise.reject(e);
        }
      }
    }
  }
};
//# sourceMappingURL=encryption.js.map
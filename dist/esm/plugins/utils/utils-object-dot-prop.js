/**
 * Copied from
 * @link https://github.com/sindresorhus/dot-prop/blob/main/index.js
 * because it is currently an esm only module.
 * TODO use the npm package again when RxDB is also fully esm.
 */

var isObject = value => {
  var type = typeof value;
  return value !== null && (type === 'object' || type === 'function');
};
var disallowedKeys = new Set(['__proto__', 'prototype', 'constructor']);
var digits = new Set('0123456789');
function getPathSegments(path) {
  var parts = [];
  var currentSegment = '';
  var currentPart = 'start';
  var isIgnoring = false;
  for (var character of path) {
    switch (character) {
      case '\\':
        {
          if (currentPart === 'index') {
            throw new Error('Invalid character in an index');
          }
          if (currentPart === 'indexEnd') {
            throw new Error('Invalid character after an index');
          }
          if (isIgnoring) {
            currentSegment += character;
          }
          currentPart = 'property';
          isIgnoring = !isIgnoring;
          break;
        }
      case '.':
        {
          if (currentPart === 'index') {
            throw new Error('Invalid character in an index');
          }
          if (currentPart === 'indexEnd') {
            currentPart = 'property';
            break;
          }
          if (isIgnoring) {
            isIgnoring = false;
            currentSegment += character;
            break;
          }
          if (disallowedKeys.has(currentSegment)) {
            return [];
          }
          parts.push(currentSegment);
          currentSegment = '';
          currentPart = 'property';
          break;
        }
      case '[':
        {
          if (currentPart === 'index') {
            throw new Error('Invalid character in an index');
          }
          if (currentPart === 'indexEnd') {
            currentPart = 'index';
            break;
          }
          if (isIgnoring) {
            isIgnoring = false;
            currentSegment += character;
            break;
          }
          if (currentPart === 'property') {
            if (disallowedKeys.has(currentSegment)) {
              return [];
            }
            parts.push(currentSegment);
            currentSegment = '';
          }
          currentPart = 'index';
          break;
        }
      case ']':
        {
          if (currentPart === 'index') {
            parts.push(Number.parseInt(currentSegment, 10));
            currentSegment = '';
            currentPart = 'indexEnd';
            break;
          }
          if (currentPart === 'indexEnd') {
            throw new Error('Invalid character after an index');
          }

          // Falls through
        }
      default:
        {
          if (currentPart === 'index' && !digits.has(character)) {
            throw new Error('Invalid character in an index');
          }
          if (currentPart === 'indexEnd') {
            throw new Error('Invalid character after an index');
          }
          if (currentPart === 'start') {
            currentPart = 'property';
          }
          if (isIgnoring) {
            isIgnoring = false;
            currentSegment += '\\';
          }
          currentSegment += character;
        }
    }
  }
  if (isIgnoring) {
    currentSegment += '\\';
  }
  switch (currentPart) {
    case 'property':
      {
        if (disallowedKeys.has(currentSegment)) {
          return [];
        }
        parts.push(currentSegment);
        break;
      }
    case 'index':
      {
        throw new Error('Index was not closed');
      }
    case 'start':
      {
        parts.push('');
        break;
      }
    // No default
  }
  return parts;
}
function isStringIndex(object, key) {
  if (typeof key !== 'number' && Array.isArray(object)) {
    var index = Number.parseInt(key, 10);
    return Number.isInteger(index) && object[index] === object[key];
  }
  return false;
}
function assertNotStringIndex(object, key) {
  if (isStringIndex(object, key)) {
    throw new Error('Cannot use string index');
  }
}

/**
 * TODO we need some performance tests and improvements here.
 */
export function getProperty(object, path, value) {
  if (Array.isArray(path)) {
    path = path.join('.');
  }

  /**
   * Performance shortcut.
   * In most cases we just have a simple property name
   * so we can directly return it.
   */
  if (!path.includes('.') && !path.includes('[')) {
    return object[path];
  }
  if (!isObject(object) || typeof path !== 'string') {
    return value === undefined ? object : value;
  }
  var pathArray = getPathSegments(path);
  if (pathArray.length === 0) {
    return value;
  }
  for (var index = 0; index < pathArray.length; index++) {
    var key = pathArray[index];
    if (isStringIndex(object, key)) {
      object = index === pathArray.length - 1 ? undefined : null;
    } else {
      object = object[key];
    }
    if (object === undefined || object === null) {
      // `object` is either `undefined` or `null` so we want to stop the loop, and
      // if this is not the last bit of the path, and
      // if it didn't return `undefined`
      // it would return `null` if `object` is `null`
      // but we want `get({foo: null}, 'foo.bar')` to equal `undefined`, or the supplied value, not `null`
      if (index !== pathArray.length - 1) {
        return value;
      }
      break;
    }
  }
  return object === undefined ? value : object;
}
export function setProperty(object, path, value) {
  if (Array.isArray(path)) {
    path = path.join('.');
  }
  if (!isObject(object) || typeof path !== 'string') {
    return object;
  }
  var root = object;
  var pathArray = getPathSegments(path);
  for (var index = 0; index < pathArray.length; index++) {
    var key = pathArray[index];
    assertNotStringIndex(object, key);
    if (index === pathArray.length - 1) {
      object[key] = value;
    } else if (!isObject(object[key])) {
      object[key] = typeof pathArray[index + 1] === 'number' ? [] : {};
    }
    object = object[key];
  }
  return root;
}
export function deleteProperty(object, path) {
  if (!isObject(object) || typeof path !== 'string') {
    return false;
  }
  var pathArray = getPathSegments(path);
  for (var index = 0; index < pathArray.length; index++) {
    var key = pathArray[index];
    assertNotStringIndex(object, key);
    if (index === pathArray.length - 1) {
      delete object[key];
      return true;
    }
    object = object[key];
    if (!isObject(object)) {
      return false;
    }
  }
}
export function hasProperty(object, path) {
  if (!isObject(object) || typeof path !== 'string') {
    return false;
  }
  var pathArray = getPathSegments(path);
  if (pathArray.length === 0) {
    return false;
  }
  for (var key of pathArray) {
    if (!isObject(object) || !(key in object) || isStringIndex(object, key)) {
      return false;
    }
    object = object[key];
  }
  return true;
}

// TODO: Backslashes with no effect should not be escaped
function escapePath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Expected a string');
  }
  return path.replace(/[\\.[]/g, '\\$&');
}

// The keys returned by Object.entries() for arrays are strings
function entries(value) {
  if (Array.isArray(value)) {
    return value.map((v, index) => [index, v]);
  }
  return Object.entries(value);
}
function stringifyPath(pathSegments) {
  var result = '';

  // eslint-disable-next-line prefer-const
  for (var [index, segment] of entries(pathSegments)) {
    if (typeof segment === 'number') {
      result += "[" + segment + "]";
    } else {
      segment = escapePath(segment);
      result += index === 0 ? segment : "." + segment;
    }
  }
  return result;
}
function* deepKeysIterator(object, currentPath = []) {
  if (!isObject(object)) {
    if (currentPath.length > 0) {
      yield stringifyPath(currentPath);
    }
    return;
  }
  for (var [key, value] of entries(object)) {
    yield* deepKeysIterator(value, [...currentPath, key]);
  }
}
export function deepKeys(object) {
  return [...deepKeysIterator(object)];
}
//# sourceMappingURL=utils-object-dot-prop.js.map
const deepEqual = require('deep-equal');
const random = require('random-object-generator');
const assert = require('assert');
const clone = require('clone');
const hash = require('spark-md5').hash;
const hashObj = require('object-hash');

const getRandomObject = function() {
    function testObject() {
        this.id = 'id';
        this.number = 'int';
        this.description = 'string';
        this.anotherObject = [new anotherTestObject()];
        this.intArray = ['int'];
    };

    function anotherTestObject() {
        this.testId = 'id';
        this.description = 'string';
        this.anotherObject = [new anotherTestObject2()];
    };

    function anotherTestObject2() {
        this.testId = 'id';
        this.description = 'string';
        this.intArray = ['int'];
    };
    return random.randomObject(new testObject());
};

const checkObj = getRandomObject();
const objects = new Array(2000)
    .fill(0)
    .map(() => {
        const obj = getRandomObject();
        return {
            obj,
            clone: clone(obj)
        };
    });


function compareHashMD5({
    obj,
    clone
}) {
    // equal
    const hash1 = hash(JSON.stringify(obj));
    const hash2 = hash(JSON.stringify(clone));
    assert.equal(hash1, hash2);

    // not equal
    const hash3 = hash(JSON.stringify(obj));
    const hash4 = hash(JSON.stringify(checkObj));
    assert.notEqual(hash3, hash4);

    return;
}

function compareHashObject({
    obj,
    clone
}) {
    // equal
    const hash1 = hashObj(JSON.stringify(obj));
    const hash2 = hashObj(JSON.stringify(clone));
    assert.equal(hash1, hash2);

    // not equal
    const hash3 = hashObj(JSON.stringify(obj));
    const hash4 = hashObj(JSON.stringify(checkObj));
    assert.notEqual(hash3, hash4);

    return;
}

function compareDeepEqual({
    obj,
    clone
}) {
    const equal = deepEqual(obj, clone);
    assert.ok(equal);

    const notEqual = deepEqual(obj, checkObj);
    assert.equal(notEqual, false);
    return;
}


console.log('MEAURE HASH (MD5):');
console.time('hash');
objects.forEach(args => compareHashMD5(args));
console.timeEnd('hash');

console.log('#########');
console.log('#########');
console.log('#########');

console.log('MEAURE HASH (OBJ):');
console.time('hashOBJ');
objects.forEach(args => compareHashObject(args));
console.timeEnd('hashOBJ');

console.log('#########');
console.log('#########');
console.log('#########');

console.log('MEAURE DEEP-EQUAL:');
console.time('deepequal');
objects.forEach(args => compareDeepEqual(args));
console.timeEnd('deepequal');

console.log('#########');
console.log('#########');
console.log('#########');


console.log('MEAURE HASH2 (MD5):');
console.time('hash2');
objects.forEach(args => compareHashMD5(args));
console.timeEnd('hash2');

console.log('#########');
console.log('#########');
console.log('#########');

console.log('MEAURE DEEP-EQUAL2:');
console.time('deepequal2');
objects.forEach(args => compareDeepEqual(args));
console.timeEnd('deepequal2');

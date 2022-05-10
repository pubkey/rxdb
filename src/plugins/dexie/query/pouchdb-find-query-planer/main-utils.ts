
function getArguments(fun: any) {
    return function () {
        const len = arguments.length;
        const args = new Array(len);
        let i = -1;
        while (++i < len) {
            args[i] = arguments[i];
        }
        const ret = fun.call(undefined, args);
        return ret;
    };
}

export const flatten = getArguments(function (args: any) {
    let res: any[] = [];
    for (let i = 0, len = args.length; i < len; i++) {
        const subArr: any = args[i] as any;
        if (Array.isArray(subArr)) {
            res = res.concat(flatten.apply(null, subArr as any));
        } else {
            res.push(subArr);
        }
    }
    return res;
});

export function mergeObjects(arr: any[]) {
    let res = {};
    for (let i = 0, len = arr.length; i < len; i++) {
        res = Object.assign(res, arr[i]);
    }
    return res;
}


// e.g. ['a'], ['a', 'b'] is true, but ['b'], ['a', 'b'] is false
export function oneArrayIsSubArrayOfOther(left: any, right: any) {
    for (let i = 0, len = Math.min(left.length, right.length); i < len; i++) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
}

// e.g.['a', 'b', 'c'], ['a', 'b'] is false
export function oneArrayIsStrictSubArrayOfOther(left: any, right: any) {
    if (left.length > right.length) {
        return false;
    }

    return oneArrayIsSubArrayOfOther(left, right);
}

// same as above, but treat the left array as an unordered set
// e.g. ['b', 'a'], ['a', 'b', 'c'] is true, but ['c'], ['a', 'b', 'c'] is false
export function oneSetIsSubArrayOfOther(left: any, right: any) {
    left = left.slice();
    for (let i = 0, len = right.length; i < len; i++) {
        const field = right[i];
        if (!left.length) {
            break;
        }
        const leftIdx = left.indexOf(field);
        if (leftIdx === -1) {
            return false;
        } else {
            left.splice(leftIdx, 1);
        }
    }
    return true;
}

export function arrayToObject(arr: any[]) {
    const res: any = {};
    for (let i = 0, len = arr.length; i < len; i++) {
        res[arr[i]] = true;
    }
    return res;
}

export function max(arr: any[], fun: Function) {
    let max = null;
    let maxScore = -1;
    for (let i = 0, len = arr.length; i < len; i++) {
        const element = arr[i];
        const score = fun(element);
        if (score > maxScore) {
            maxScore = score;
            max = element;
        }
    }
    return max;
}

export function arrayEquals(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0, len = arr1.length; i < len; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

export function uniq(arr: any[]) {
    const obj: any = {};
    for (let i = 0; i < arr.length; i++) {
        obj['$' + arr[i]] = true;
    }
    return Object.keys(obj).map(function (key) {
        return key.substring(1);
    });
}

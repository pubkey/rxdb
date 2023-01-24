import { ensureNotFalsy } from './utils-other';

export const REGEX_ALL_DOTS = /\./g;
export const REGEX_ALL_PIPES = /\|/g;



export type ParsedRegex = {
    pattern: string;
    flags: string;
};

/**
 * @link https://stackoverflow.com/a/26034888/3443137
*/
export const REGEX_PARSE_REGEX_EXPRESSION = /(\/?)(.+)\1([a-z]*)/i;
export function parseRegex(regex: RegExp): ParsedRegex {
    const matches = ensureNotFalsy(regex.toString().match(REGEX_PARSE_REGEX_EXPRESSION));
    return {
        pattern: matches[2],
        flags: matches[3]
    };
}

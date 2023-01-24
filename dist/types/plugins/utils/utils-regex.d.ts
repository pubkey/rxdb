export declare const REGEX_ALL_DOTS: RegExp;
export declare const REGEX_ALL_PIPES: RegExp;
export type ParsedRegex = {
    pattern: string;
    flags: string;
};
/**
 * @link https://stackoverflow.com/a/26034888/3443137
*/
export declare const REGEX_PARSE_REGEX_EXPRESSION: RegExp;
export declare function parseRegex(regex: RegExp): ParsedRegex;

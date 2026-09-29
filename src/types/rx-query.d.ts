import type {
    RxQueryBase
} from '../rx-query.d.ts';
import type { MaybeReadonly, Paths } from './util.d.ts';

/**
 * Typed Mango Query Selector
 * @link https://github.com/mongodb/node-mongodb-native/blob/26bce4a8debb65df5a42dc8599e886c9c83de10d/src/mongo_types.ts
 * @link https://stackoverflow.com/a/58436959/3443137
 */


export type PropertyType<Type, Property extends string> = string extends Property
    ? unknown
    : Property extends keyof Type
    ? Type[Property]
    : Property extends `${number}`
    ? Type extends ReadonlyArray<infer ArrayType>
    ? ArrayType
    : unknown
    : Property extends `${infer Key}.${infer Rest}`
    ? Key extends `${number}`
    ? Type extends ReadonlyArray<infer ArrayType>
    ? PropertyType<ArrayType, Rest>
    : unknown
    : Key extends keyof Type
    ? Type[Key] extends Map<string, infer MapType>
    ? MapType
    : PropertyType<Type[Key], Rest>
    : unknown
    : unknown;


export type MangoQueryRegexOptions = 'i' | 'g' | 'm' | 'gi' | 'ig' | 'igm' | string;

/**
 * Maximum nesting depth for which dot-path strings like 'nested.deep.field'
 * are generated for the selector keys and sort fields of a typed query.
 * A depth of 5 generates paths with up to 6 segments.
 * The cap is required because deeper path unions slow down the compiler
 * and can hit the TypeScript recursion limits on recursive document types.
 * To query fields that are nested deeper, cast the query to MangoQuery<any>.
 */
export type MangoQueryPathsMaxDepth = 5;

/**
 * All valid dot-path strings of a document type
 * that can be used as selector keys and sort fields.
 */
export type MangoQueryPaths<RxDocType> = Paths<RxDocType, MangoQueryPathsMaxDepth>;

/**
 * When the value of a field cannot be determined from the document type,
 * fall back to any so that untyped and loosely typed collections
 * accept the same queries as before.
 */
export type MangoQueryPathValue<PathValueType> = unknown extends PathValueType ? any : PathValueType;

/**
 * Document types without known fields, like the RxDocument<{}> default,
 * are used as 'any document', so they keep plain string paths.
 */
export type MangoQueryPathsOrString<RxDocType> = keyof RxDocType extends never ? string : MangoQueryPaths<RxDocType>;

/**
 * On array fields, mango queries match when the given value
 * equals the whole array or any single item of it.
 */
export type MangoQueryFieldValue<PathValueType> = PathValueType extends ReadonlyArray<infer ItemType>
    ? PathValueType | ItemType
    : PathValueType;

/**
 * The comparison operators $gt/$gte/$lt/$lte
 * are only allowed on number and string fields.
 */
export type MangoQueryComparisonValue<PathValueType> = PathValueType extends number | string ? PathValueType : never;

/*
 * The MongoDB query library is huge and we do not need all the operators.
 * If you add an operator here, make sure that you properly add a test in
 * the file /test/unit/rx-storage-query-correctness.test.ts
 *
 * The operators are typed depending on the type of the field
 * they are used on, so that for example using $regex
 * on a number field is a compile error.
 *
 * @link https://github.com/kofrasa/mingo#es6
 */
export interface MangoQueryOperators<PathValueType> {
    $eq?: MangoQueryFieldValue<PathValueType>;
    $gt?: MangoQueryComparisonValue<PathValueType>;
    $gte?: MangoQueryComparisonValue<PathValueType>;
    $lt?: MangoQueryComparisonValue<PathValueType>;
    $lte?: MangoQueryComparisonValue<PathValueType>;
    $ne?: MangoQueryFieldValue<PathValueType>;
    $in?: MangoQueryFieldValue<PathValueType>[];
    $nin?: MangoQueryFieldValue<PathValueType>[];
    $regex?: PathValueType extends string ? string : never;
    $options?: PathValueType extends string ? MangoQueryRegexOptions : never;
    $exists?: boolean;
    $type?: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';
    $mod?: PathValueType extends number ? [number, number] : never;
    $not?: MangoQueryFieldValue<PathValueType> | MangoQueryOperators<PathValueType>;
    $size?: PathValueType extends ReadonlyArray<any> ? number : never;
    $elemMatch?: PathValueType extends ReadonlyArray<infer ItemType>
    ? MangoQuerySelector<ItemType> | MangoQueryOperators<ItemType>
    : never;
}

export type MangoQuerySelector<DocType = any> = Partial<{
    [Property in MangoQueryPaths<DocType>]:
    MangoQueryOperators<MangoQueryPathValue<PropertyType<DocType, Property>>> |
    MangoQueryFieldValue<MangoQueryPathValue<PropertyType<DocType, Property>>>;
}> & {
    $and?: MangoQuerySelector<DocType>[];
    $or?: MangoQuerySelector<DocType>[];
    $nor?: MangoQuerySelector<DocType>[];
};

/**
 * Discussion was at:
 * @link https://github.com/pubkey/rxdb/issues/1972
 */
export type MangoQuerySortDirection = 'asc' | 'desc';
/**
 * One sort part must contain exactly one field,
 * multiple fields are given as multiple sort parts
 * so that their order is deterministic.
 * The mapped type distributes over all field paths and
 * marks all other paths as never, which makes a sort part
 * with more than one field a compile error.
 * Sort parts of dynamically built queries have to be
 * casted, same as the other parts of MangoQuery<any>.
 */
type MangoQuerySortPartExactlyOne<Key extends string, AllPaths extends string> = {
    [K in Key]: MangoQuerySortDirection;
} & {
    [K in Exclude<AllPaths, Key>]?: never;
};
/**
 * The distribution over the single keys requires a naked
 * type parameter, an inferred local type does not distribute.
 * For untyped documents the sort part must be any because
 * an exactly-one type is not assignable in either direction
 * of RxCollection<any> and RxCollection<DocType>.
 */
type MangoQuerySortPartDistribute<Keys extends string, AllPaths extends string> = Keys extends string
    ? string extends Keys
    ? any
    : MangoQuerySortPartExactlyOne<Keys, AllPaths>
    : never;
export type MangoQuerySortPart<RxDocType = any> = MangoQuerySortPartDistribute<
    MangoQueryPaths<RxDocType> & string,
    MangoQueryPaths<RxDocType> & string
>;

export type MangoQuerySelectorAndIndex<RxDocType = any> = {
    /**
     * Selector is optional,
     * if not given, the query matches all documents
     * that are not _deleted=true.
     */
    selector?: MangoQuerySelector<RxDocType>;
    /**
     * By default, the RxStorage implementation
     * decides which index to use when running the query.
     *
     * For better performance, a different index might be defined
     * by setting it in the query.
     * How this improves performance and if the defined index is used,
     * depends on the RxStorage implementation.
     */
    index?: MangoQueryPaths<RxDocType> | MaybeReadonly<MangoQueryPaths<RxDocType>[]>;
};

export type MangoQueryNoLimit<RxDocType> = MangoQuerySelectorAndIndex<RxDocType> & {
    /**
     * Sorting of the results.
     * If no sort is set, RxDB will sort by the primary key.
     * Also if sort is set, RxDB will add primaryKey sorting
     * if the primaryKey was not in the sort parameters before.
     * This ensures that there is a deterministic sorting of the
     * results, not mather at which order the documents have been
     * inserted into the storage.
     */
    sort?: MangoQuerySortPart<RxDocType>[];
};

/**
 * Mango query for RxDB collections.
 */
export type MangoQuery<RxDocType = any> = MangoQueryNoLimit<RxDocType> & {
    skip?: number;
    limit?: number;
};

export type RxQueryOP = 'find' | 'findOne' | 'count' | 'findByIds';

export declare class RxQuery<
    RxDocumentType = any,
    RxQueryResult = any,
    OrmMethods = {},
    Reactivity = unknown
> extends RxQueryBase<RxDocumentType, RxQueryResult, OrmMethods, Reactivity> {
    /**
     * .where() with a field path returns a builder state
     * whose operator methods are typed by the value type of that field.
     * .where() with a selector object merges the selector into the query.
     */
    where<Path extends MangoQueryPaths<RxDocumentType>>(path: Path): RxQueryFieldSelector<
        RxDocumentType, RxQueryResult, OrmMethods, Reactivity,
        MangoQueryPathValue<PropertyType<RxDocumentType, Path>>
    >;
    where(selector: MangoQuerySelector<RxDocumentType>): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    sort(params: MangoQuerySortPart<RxDocumentType> | MangoQueryPaths<RxDocumentType> | `-${string & MangoQueryPaths<RxDocumentType>}`): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    equals(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    eq(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    or(conditions: MangoQuerySelector<RxDocumentType>[]): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    nor(conditions: MangoQuerySelector<RxDocumentType>[]): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    and(conditions: MangoQuerySelector<RxDocumentType>[]): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    gt(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    gte(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    lt(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    lte(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    ne(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    in(queryObj: any[]): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    nin(queryObj: any[]): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    all(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    size(queryObj: number): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    regex(queryObj: string | {
        $regex: string;
        $options: MangoQueryRegexOptions;
    }): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    exists(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    elemMatch(queryObj: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
    mod(p1: any, p2: any, p3: any): RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity>;
}

/**
 * The builder state after .where('field.path') was called.
 * The operator methods are constrained by the type of that field,
 * same as the operators of MangoQueryOperators.
 * Each operator keeps the field context, so multiple operators
 * can be chained on the same field, like .where('age').gt(10).lt(90).
 * Calling .where() again switches to another field.
 */
export declare class RxQueryFieldSelector<
    RxDocumentType = any,
    RxQueryResult = any,
    OrmMethods = {},
    Reactivity = unknown,
    PathValueType = any
> extends RxQuery<RxDocumentType, RxQueryResult, OrmMethods, Reactivity> {
    equals(value: MangoQueryFieldValue<PathValueType>): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    eq(value: MangoQueryFieldValue<PathValueType>): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    ne(value: MangoQueryFieldValue<PathValueType>): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    gt(value: MangoQueryComparisonValue<PathValueType>): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    gte(value: MangoQueryComparisonValue<PathValueType>): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    lt(value: MangoQueryComparisonValue<PathValueType>): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    lte(value: MangoQueryComparisonValue<PathValueType>): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    in(values: MangoQueryFieldValue<PathValueType>[]): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    nin(values: MangoQueryFieldValue<PathValueType>[]): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    all(values: PathValueType extends ReadonlyArray<infer ItemType> ? ItemType[] : never): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    size(value: PathValueType extends ReadonlyArray<any> ? number : never): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    regex(value: PathValueType extends string ? (string | {
        $regex: string;
        $options: MangoQueryRegexOptions;
    }) : never): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    exists(value: boolean): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
    elemMatch(selector: PathValueType extends ReadonlyArray<infer ItemType>
        ? MangoQuerySelector<ItemType> | MangoQueryOperators<ItemType>
        : never): RxQueryFieldSelector<RxDocumentType, RxQueryResult, OrmMethods, Reactivity, PathValueType>;
}

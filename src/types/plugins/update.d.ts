import type {
    MangoQueryPaths,
    MangoQueryPathValue,
    PropertyType
} from '../rx-query.d.ts';

/**
 * Typed update operators for RxDocument.update() and RxQuery.update().
 * The field paths are the same dot-path strings as in the mango query
 * selector and the value types are constrained by the type
 * of the field they are applied to.
 * Dynamically built updates can be casted to UpdateQuery<any>.
 */

/**
 * Fields with their own value type,
 * used by $set, $min and $max.
 */
export type UpdateFieldValues<TSchema> = Partial<{
    [Path in MangoQueryPaths<TSchema>]: MangoQueryPathValue<PropertyType<TSchema, Path>>;
}>;

/**
 * The conditions distribute over union types like number | undefined
 * of optional fields, so the helpers take the value type
 * as a plain type parameter.
 */
type UpdateNumberValue<FieldType> = FieldType extends number ? number : never;
type UpdateArrayItemValue<FieldType> = FieldType extends ReadonlyArray<infer ItemType> ? ItemType : never;
type UpdateArrayItemArrayValue<FieldType> = FieldType extends ReadonlyArray<infer ItemType> ? ItemType[] : never;
type UpdateArrayPopValue<FieldType> = FieldType extends ReadonlyArray<any> ? 1 | -1 : never;

/**
 * Only number fields, used by $inc.
 */
export type UpdateNumberFieldValues<TSchema> = Partial<{
    [Path in MangoQueryPaths<TSchema>]: UpdateNumberValue<MangoQueryPathValue<PropertyType<TSchema, Path>>>;
}>;

/**
 * Only array fields with the item type as value,
 * used by $push and $addToSet.
 */
export type UpdateArrayItemValues<TSchema> = Partial<{
    [Path in MangoQueryPaths<TSchema>]: UpdateArrayItemValue<MangoQueryPathValue<PropertyType<TSchema, Path>>>;
}>;

/**
 * Only array fields with an array of items as value,
 * used by $pullAll.
 */
export type UpdateArrayItemArrayValues<TSchema> = Partial<{
    [Path in MangoQueryPaths<TSchema>]: UpdateArrayItemArrayValue<MangoQueryPathValue<PropertyType<TSchema, Path>>>;
}>;

/**
 * Only array fields, used by $pop
 * which removes the first (-1) or last (1) item.
 */
export type UpdateArrayPopValues<TSchema> = Partial<{
    [Path in MangoQueryPaths<TSchema>]: UpdateArrayPopValue<MangoQueryPathValue<PropertyType<TSchema, Path>>>;
}>;

/**
 * Any known field, the value is ignored at runtime,
 * used by $unset.
 */
export type UpdateUnsetFieldValues<TSchema> = Partial<{
    [Path in MangoQueryPaths<TSchema>]: any;
}>;

export type UpdateQuery<TSchema> = {
    $min?: UpdateFieldValues<TSchema>;
    $max?: UpdateFieldValues<TSchema>;
    $inc?: UpdateNumberFieldValues<TSchema>;
    $set?: UpdateFieldValues<TSchema>;
    $unset?: UpdateUnsetFieldValues<TSchema>;
    $push?: UpdateArrayItemValues<TSchema>;
    $addToSet?: UpdateArrayItemValues<TSchema>;
    $pop?: UpdateArrayPopValues<TSchema>;
    $pullAll?: UpdateArrayItemArrayValues<TSchema>;
    $rename?: Partial<Record<MangoQueryPaths<TSchema>, string>>;
};

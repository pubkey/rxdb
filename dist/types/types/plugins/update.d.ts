import type { AnyKeys, AnyObject } from '../util.d.ts';

// import type {
//     UpdateExpression
// } from 'mingo/updater';

/**
 * We use an own type here, copied from mongoose
 * @link https://github.com/Automattic/mongoose/blob/eb292d2c4cc98ee315f118d6199a83938f06d901/types/index.d.ts#L466
 * When the mingo library implements a schema-based type for UpdateExpression, we can use these typings instead.
 */
export type UpdateQuery<TSchema> = {
    $min?: AnyKeys<TSchema> & AnyObject;
    $max?: AnyKeys<TSchema> & AnyObject;
    $inc?: AnyKeys<TSchema> & AnyObject;
    $set?: AnyKeys<TSchema> & AnyObject;
    $unset?: AnyKeys<TSchema> & AnyObject;
    $push?: AnyKeys<TSchema> & AnyObject;
    $addToSet?: AnyKeys<TSchema> & AnyObject;
    $pop?: AnyKeys<TSchema> & AnyObject;
    $pullAll?: AnyKeys<TSchema> & AnyObject;
    $rename?: Record<string, string>;
};

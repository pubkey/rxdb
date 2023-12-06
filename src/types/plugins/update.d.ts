import type { AnyKeys, AnyObject } from '../util.d.ts';

import type {
    UpdateExpression
} from 'mingo/updater';

/**
 * TODO use schema-based type. Best is to make a PR to the mingo repo.
 * @link https://github.com/Automattic/mongoose/blob/eb292d2c4cc98ee315f118d6199a83938f06d901/types/index.d.ts#L466
 */
export type UpdateQuery<TSchema> = UpdateExpression;
/*
{
    $min?: AnyKeys<TSchema> & AnyObject;
    $max?: AnyKeys<TSchema> & AnyObject;
    $inc?: AnyKeys<TSchema> & AnyObject;
    $set?: AnyKeys<TSchema> & AnyObject;
    $unset?: AnyKeys<TSchema> & AnyObject;
    $push?: AnyKeys<TSchema> & AnyObject;
    $pushAll?: AnyKeys<TSchema> & AnyObject;
    $addToSet?: AnyKeys<TSchema> & AnyObject;
    $pop?: AnyKeys<TSchema> & AnyObject;
    $pullAll?: AnyKeys<TSchema> & AnyObject;
    $rename?: Record<string, string>;

    // add all other update operators from mingo
} & UpdateExpression;
*/


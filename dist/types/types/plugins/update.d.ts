import { AnyKeys, AnyObject } from '../util';

/**
 * @link https://github.com/Automattic/mongoose/blob/eb292d2c4cc98ee315f118d6199a83938f06d901/types/index.d.ts#L466
 */
export type UpdateQuery<TSchema> = {
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


    /**
     * The following operators a commented out
     * because they are not implemented into modifyjs.
     * @link https://github.com/lgandecki/modifyjs#implemented
     */
    //  $bit?: Record<string, mongodb.NumericType>;
    //  $currentDate?: AnyKeys<TSchema> & AnyObject;
    //  $mul?: AnyKeys<TSchema> & AnyObject;
    //  $pull?: AnyKeys<TSchema> & AnyObject;
    //  $setOnInsert?: AnyKeys<TSchema> & AnyObject;
};



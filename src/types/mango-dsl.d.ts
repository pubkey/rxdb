// @see https://github.com/cloudant/mango

export type MangoQuerySelector<T> =
    | MangoPropertyOperator<T>
    | MangoCombinationOperator<T>

export type MangoOperator<T> =
    | MangoPropertyOperator<T>
    | MangoCombinationOperator<T>
    | MangoConditionOperator<T>

export type MangoPropertyOperator<T> = {
    readonly [Property in keyof T]?:
        | MangoCombinationOperator<T[Property]>
        | MangoConditionOperator<T[Property]>
        | (T[Property] extends object ? MangoOperator<T[Property]> : T[Property])
};

export interface $AndCombinationOperator<T> {
    readonly $and: readonly MangoQuerySelector<T>[]
}

export interface $OrCombinationOperator<T> {
    readonly $or: readonly MangoQuerySelector<T>[]
}

export interface $NotCombinationOperator<T> {
    readonly $not: MangoQuerySelector<T>;
}

export interface $NorCombinationOperator<T> {
    readonly $nor: readonly MangoQuerySelector<T>[]
}

export interface $AllCombinationOperator<T> {
    readonly $all: readonly MangoQuerySelector<T>[]
}

export type $ElemMatchCombinationOperator<T extends readonly unknown[]> = {
    readonly $elemMatch: readonly MangoOperator<T[number]>[]
}

export type MangoCombinationOperator<T> =
    | $AndCombinationOperator<T>
    | $OrCombinationOperator<T>
    | $NotCombinationOperator<T>
    | $NorCombinationOperator<T>
    | $AllCombinationOperator<T>
    | (T extends readonly unknown[] ? $ElemMatchCombinationOperator<T> : never)

export interface $LTConditionOperator<T> {
    readonly $lt: T
}

export interface $LTEConditionOperator<T> {
    readonly $lte: T
}

export interface $EQConditionOperator<T> {
    readonly $eq: T
}

export interface $NEConditionOperator<T> {
    readonly $ne: T
}

export interface $GTEConditionOperator<T> {
    readonly $gte: T
}

export interface $GTConditionOperator<T> {
    readonly $gt: T
}

export interface $ExistsConditionOperator {
    readonly $exists: boolean
}

export interface $TypeConditionOperator<T> {
    readonly $type: T
}

export interface $InConditionOperator<T> {
    readonly $in: readonly T[]
}

export interface $NInConditionOperator<T> {
    readonly $nin: readonly T[]
}

export interface $SizeConditionOperator {
    readonly $size: number
}

export interface $ModConditionOperator {
    readonly $mod: readonly [divisor: number, remainder: number]
}

export interface $RegexConditionOperator {
    readonly $regex: string
}

export type MangoConditionOperator<T> =
    | $LTConditionOperator<T>
    | $LTEConditionOperator<T>
    | $EQConditionOperator<T>
    | $NEConditionOperator<T>
    | $GTEConditionOperator<T>
    | $GTConditionOperator<T>
    | $ExistsConditionOperator
    | $TypeConditionOperator<T>
    | $InConditionOperator<T>
    | $NInConditionOperator<T>
    | $SizeConditionOperator
    | $ModConditionOperator
    | $RegexConditionOperator

/**
 * Discussion was at:
 * @link https://github.com/pubkey/rxdb/issues/1972
 */
export type MangoQuerySortDirection = 'asc' | 'desc';

export type MangoQuerySortPart<RxDocType> = {
    readonly [k in keyof RxDocType | string]: MangoQuerySortDirection;
};

export interface MangoQueryNoLimit<RxDocType> {
    readonly selector: MangoQuerySelector<RxDocType>;
    readonly skip?: number;
    readonly sort?: MangoQuerySortPart<RxDocType>[]
}

export interface MangoQuery<RxDocType = unknown> extends MangoQueryNoLimit<RxDocType> {
    readonly limit?: number;
}

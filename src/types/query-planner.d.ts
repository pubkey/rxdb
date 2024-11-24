export type RxQueryPlanKey = string | number | undefined;

export type RxQueryPlanerOpts = {
    startKey: RxQueryPlanKey;
    endKey: RxQueryPlanKey;
    /**
     * True if the first matching document
     * must also be included into the result set.
     */
    inclusiveStart: boolean;
    /**
     * True if the last matching document
     * must also be included into the result set.
     */
    inclusiveEnd: boolean;
};

export type RxQueryPlan = {
    index: string[];
    /**
     * If the index does not match the sort params,
     * we have to resort the query results manually
     * after fetching them from the index.
     */
    sortSatisfiedByIndex: boolean;

    /**
     * If the whole selector matching is satisfied
     * by the index, we do not have to run a does-document-data-match-query
     * stuff.
     */
    selectorSatisfiedByIndex: boolean;

    startKeys: RxQueryPlanKey[];
    endKeys: RxQueryPlanKey[];
    /**
     * True if the first matching document
     * must also be included into the result set.
     */
    inclusiveStart: boolean;
    /**
     * True if the last matching document
     * must also be included into the result set.
     */
    inclusiveEnd: boolean;

};

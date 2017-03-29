/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 */
class QueryChangeDetector {

    constructor(query) {
        this.query = query;
    }

    /**
     * @param {Object[]} resultsData of previous results
     * @param {ChangeEvent[]} changeEvents
     * @return {{mustReExec: boolean, results: []}} if reexec==true, the query must rerun over the database
     */
    runChangeDetection(resultsData, changeEvents) {
        if (changeEvents.length == 0) {
            return {
                mustReExec: false,
                results: null
            };
        }
//        const docId = changeEvent.data.doc;
//        const previousResults = this.query.results;
//        const wasDocInResults = previousResults.find();
        // TODO continue here
        return {
            mustReExec: true,
            results: results
        };
    }

}


/**
 * [create description]
 * @param  {RxQuery} query [description]
 * @return {QueryChangeDetector}         [description]
 */
export function create(query) {
    const ret = new QueryChangeDetector(query);
    return ret;
}

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
     * @param {ChangeEvent}
     * @return {{reexec: boolean, results: []}} if reexec==true, the query must rerun over the database
     */
    runChangeDetection(changeEvent) {
        const docId = changeEvent.data.doc;
        const previousResults = this.query.results;
        const wasDocInResults = previousResults.find();
        // TODO continue here
    }

}


/**
 * [create description]
 * @param  {RxQuery} query [description]
 * @return {QueryChangeDetector}         [description]
 */
export default function create(query) {
    const ret = new QueryChangeDetector(query);
    return ret;
}

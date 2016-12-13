import * as RxChangeEvent from './RxChangeEvent';

/**
 * this handles the leader-election
 */
class RxDatabaseLeaderElector {
    constructor(database) {
        this.database = database;
        this.socketMessages$ = database.observable$
            .filter(cEvent => cEvent.data.it != this.database.token)
            .filter(cEvent => cEvent.data.op.startsWith('Leader.'))
            .map(cEvent => {
                return {
                    type: cEvent.data.op.split('.')[1],
                    token: cEvent.data.it
                };
            });

        this.isLeader = false;
    }

    async prepare() {

    }

    /**
     * send a leader-election message over the socket
     * @param {string} type (apply, death, tell)
     * apply: tells the others I want to be leader
     * death: tells the others I will die and they must elect a new leader
     * tell:  tells the others I am leader and they should not elect a new one
     */
    async socketMessage(type) {
        if (!['apply', 'death', 'tell'].includes(type))
            throw new Error('type ' + type + ' is not valid');

        const changeEvent = RxChangeEvent.create(
            'Leader.' + type,
            this.database
        );
        await this.database.writeToSocket(changeEvent);
        return true;
    }
}


export async function create(database) {
    const elector = new RxDatabaseLeaderElector(database);
    await elector.prepare();
    return elector;
}

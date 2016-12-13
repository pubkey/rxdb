import * as RxChangeEvent from './RxChangeEvent';
import * as util from './util';

/**
 * this handles the leader-election for the given RxDatabase-instance
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
                    token: cEvent.data.it,
                    time: cEvent.data.t
                };
            });
        this.isLeader = false;

        this.isApplying = false;
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

    /**
     * assigns leadership to this instance
     */
    async beLeader() {
        this.isLeader = true;

        //  await this.socketMessage('tell');

        // reply to 'apply'-messages
        const sub = this.socketMessages$
            .filter(message => message.type == 'apply')
            .subscribe(message => this.socketMessage('tell'));
        this.database.subs.push(sub);
    }

    /**
     * starts applying for leadership
     */
    async startApplying() {
        if (this.isLeader) return;
        if (this.isApplying) return;
        this.isApplying = true;
        const startTime = new Date().getTime();


        /*        this.socketMessages$.subscribe(m => {
                    console.log('aaaaa:');
                    console.dir(m);
                });*/

        // stop applying when other is leader
        const sub = this.socketMessages$
            .filter(m => m.type == 'tell')
            .filter(m => m.time > startTime)
            .subscribe(message => this.isApplying = false);

        // stop applyling when better is applying (higher lexixal token)
        const sub2 = this.socketMessages$
            .filter(m => m.type == 'apply')
            .filter(m => m.time > startTime)
            .filter(m => this.database.token < m.token)
            .subscribe(m => this.isApplying = false);

        let tries = 0;
        while (tries < 3 && this.isApplying) {
            tries++;
            await this.socketMessage('apply');
            await util.promiseWait(this.database.socketRoundtripTime);
        }
        await this.database.$pull();
        await util.promiseWait(50);

        sub.unsubscribe();
        sub2.unsubscribe();

        if (this.isApplying) await this.beLeader();
        this.isApplying = false;
    }

}


export async function create(database) {
    const elector = new RxDatabaseLeaderElector(database);
    await elector.prepare();
    return elector;
}

import * as RxChangeEvent from './RxChangeEvent';
import * as util from './util';
import * as unload from 'unload';

/**
 * this handles the leader-election for the given RxDatabase-instance
 */

const documentID = '_local/leader';

class LeaderElector {


    constructor(database) {

        // things that must be cleared ondestroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.id = this.database.token;

        this.isLeader = false;
        this.becomeLeader$ = new util.Rx.BehaviorSubject(this.isLeader);
        this.isDead = false;
        this.isApplying = false;
        this.isWaiting = false;

        this.signalTime = 200; // TODO evaluate this time
    }

    async prepare() {}

    createLeaderObject() {
        return {
            _id: documentID,
            is: '', // token of leader-instance
            apply: '', // token of applying instance
            t: 0 // time when the leader send a signal the last time
        };
    }
    async getLeaderObject() {
        let obj;
        try {
            obj = await this.database.administrationCollection
                .pouch.get(documentID);
        } catch (e) {
            obj = this.createLeaderObject();
            const ret = await this.database.administrationCollection.pouch.put(obj);
            obj._rev = ret.rev;
        }
        return obj;
    }

    async setLeaderObject(newObj) {
        await this.database.administrationCollection.pouch.put(newObj);
        return;
    }

    /**
     * starts applying for leadership
     */
    async applyOnce() {
        if (this.isLeader) return false;
        if (this.isDead) return false;
        if (this.isApplying) return false;
        this.isApplying = true;

        console.log('applyOnce()');

        try {
            let leaderObj = await this.getLeaderObject();
            const minTime = new Date().getTime() - this.signalTime * 10;

            if (leaderObj.t >= minTime)
                throw new Error('someone else is applying/leader');
            console.log('applyOnce()1');
            // write applying to db
            leaderObj.apply = this.id;
            leaderObj.t = new Date().getTime();
            await this.setLeaderObject(leaderObj);
            console.log('applyOnce()2');

            // w8 one cycle
            await util.promiseWait(this.signalTime * 0.5);
            console.log('applyOnce()3');

            // check if someone overwrote it
            leaderObj = await this.getLeaderObject();
            if (leaderObj.apply != this.id)
                throw new Error('someone else overwrote apply');
            console.log('applyOnce()4');

            // I am leader now
            await this.beLeader();

        } catch (e) {
            //          console.log('error applying');
            // console.log('applyOnce:error:');
            // console.dir(e);
        }
        console.log('applyOnce():done');
        this.isApplying = false;
        return true;
    }


    async leaderSignal() {
        if (this.leaderSignal_run) return;
        this.leaderSignal_run = true;

        console.log('leaderSignal()');
        let success = false;
        while (!success) {
            console.log('leaderSignal: once');

            try {
                const leaderObj = await this.getLeaderObject();
                leaderObj.is = this.id;
                leaderObj.apply = this.id;
                leaderObj.t = new Date().getTime();
                await this.setLeaderObject(leaderObj);
                success = true;
            } catch (e) {
                console.log('leaderSignal:error:');
                console.dir(e);
            }
        }
        console.log('leaderSignalDone()');

        this.leaderSignal_run = false;
        return;
    }

    /**
     * assigns leadership to this instance
     */
    async beLeader() {
        if (this.isDead) return false;
        if (this.isLeader) return false;
        this.isLeader = true;
        this.becomeLeader$.next(true);

        this.applyInterval && this.applyInterval.unsubscribe();

        await this.leaderSignal();

        // signal leadership on interval
        this.signalLeadership = util.Rx.Observable
            .interval(this.signalTime)
            .subscribe(() => {
                this.leaderSignal();
            });
        this.subs.push(this.signalLeadership);

        // this.die() on unload
        this.unloads.push(
            unload.add(this.die)
        );

        return true;
    }


    async die() {
        if (!this.isLeader) return false;
        if (this.isDead) return false;
        this.isDead = true;
        this.isLeader = false;
        this.signalLeadership.unsubscribe();

        // force.write to db
        let success = false;
        while (!success) {
            try {
                const leaderObj = await this.getLeaderObject();
                leaderObj.t = 0;
                await this.setLeaderObject(leaderObj);
                success = true;
            } catch (e) {}
        }
        return true;
    }

    /**
     * @return {Promise} promise which resolve when the instance becomes leader
     */
    async waitForLeadership() {
        if (this.isLeader) return Promise.resolve(true);
        if (!this.isWaiting) {
            this.isWaiting = true;
            // TODO emit socketMessage on die() and subscribe here to it

            // apply on interval
            this.applyInterval = util.Rx.Observable
                .interval(this.signalTime * 2)
                .subscribe(x => this.applyOnce());
            this.subs.push(this.applyInterval);

            // apply now
            this.applyOnce();
        }

        return new Promise(res => {
            this.becomeSub = this.becomeLeader$
                .filter(i => i == true)
                .subscribe(i => res());
            this.subs.push(this.becomeSub);
        });
    }


    async destroy() {
        this.subs.map(sub => sub.unsubscribe());
        this.unloads.map(fn => fn());
        await this.die();
    }
}


export async function create(database) {
    const elector = new LeaderElector(database);
    await elector.prepare();
    return elector;
}

export {
    documentID as documentID
};

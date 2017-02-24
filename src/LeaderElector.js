/**
 * this handles the leader-election for the given RxDatabase-instance
 */

import * as unload from 'unload';

import * as util from './util';
import * as RxChangeEvent from './RxChangeEvent';
import * as RxBroadcastChannel from './RxBroadcastChannel';

const documentID = '_local/leader';
const SIGNAL_TIME = 500; // TODO evaluate this time

class LeaderElector {
    constructor(database) {

        // things that must be cleared on destroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.token = this.database.token;

        this.isLeader = false;
        this.becomeLeader$ = new util.Rx.BehaviorSubject({
            isLeader: false
        });

        this.isDead = false;
        this.isApplying = false;
        this.isWaiting = false;

        this.bc = RxBroadcastChannel.create(this.database, 'leader');
        this.electionChannel = this.bc ? 'broadcast' : 'socket';
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
            obj = await this.database._adminPouch.get(documentID);
        } catch (e) {
            obj = this.createLeaderObject();
            const ret = await this.database._adminPouch.put(obj);
            obj._rev = ret.rev;
        }
        return obj;
    }

    async setLeaderObject(newObj) {
        await this.database._adminPouch.put(newObj);
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

        const elected = await this['apply_' + this.electionChannel]();

        if (elected) {
            // I am leader now
            await this.beLeader();
        }

        this.isApplying = false;
        return true;
    }

    /**
     * apply via socket
     * (critical on chrome with indexedDB due to write-locks)
     */
    async apply_socket() {
        try {
            let leaderObj = await this.getLeaderObject();
            const minTime = new Date().getTime() - SIGNAL_TIME * 2;

            if (leaderObj.t >= minTime)
                throw new Error('someone else is applying/leader');
            // write applying to db
            leaderObj.apply = this.token;
            leaderObj.t = new Date().getTime();
            await this.setLeaderObject(leaderObj);

            // w8 one cycle
            await util.promiseWait(SIGNAL_TIME * 0.5);

            // check if someone overwrote it
            leaderObj = await this.getLeaderObject();
            if (leaderObj.apply != this.token)
                throw new Error('someone else overwrote apply');

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * apply via BroadcastChannel-API
     * (better performance than socket)
     */
    async apply_broadcast() {

        const applyTime = new Date().getTime();
        const subs = [];
        const errors = [];

        const whileNoError = async() => {
            subs.push(this.bc.$
                .filter(msg => !!this.isApplying)
                .filter(msg => msg.t >= applyTime)
                .filter(msg => msg.type == 'apply')
                .filter(msg => {
                    if (
                        msg.data < applyTime ||
                        (
                            msg.data == applyTime &&
                            msg.it > this.token
                        )
                    ) return true;
                    else return false;
                })
                .filter(msg => errors.length < 1)
                .subscribe(msg => errors.push('other is applying:' + msg.it))
            );
            subs.push(this.bc.$
                .filter(msg => !!this.isApplying)
                .filter(msg => msg.t >= applyTime)
                .filter(msg => msg.type == 'tell')
                .filter(msg => errors.length < 1)
                .subscribe(msg => errors.push('other is leader' + msg.it))
            );
            subs.push(this.bc.$
                .filter(msg => !!this.isApplying)
                .filter(msg => msg.type == 'apply')
                .filter(msg => {
                    if (
                        msg.data > applyTime ||
                        (
                            msg.data == applyTime &&
                            msg.it > this.token
                        )
                    ) return true;
                    else return false;
                })
                .subscribe(msg => this.bc.write('apply', applyTime))
            );

            let circles = 3;
            while (circles > 0) {
                circles--;
                await this.bc.write('apply', applyTime);
                await util.promiseWait(300); // give others time to respond
                if (errors.length > 0) return false;
            }
            return true;
        };
        const ret = await whileNoError();
        subs.map(sub => sub.unsubscribe());
        return ret;
    }


    async leaderSignal() {
        if (this.leaderSignal_run) return;
        this.leaderSignal_run = true;
        switch (this.electionChannel) {
            case 'broadcast':
                await this.bc.write('tell');
                break;
            case 'socket':
                let success = false;
                while (!success) {
                    try {
                        const leaderObj = await this.getLeaderObject();
                        leaderObj.is = this.token;
                        leaderObj.apply = this.token;
                        leaderObj.t = new Date().getTime();
                        await this.setLeaderObject(leaderObj);
                        success = true;
                    } catch (e) {
                        console.dir(e);
                    }
                }
                break;
        }
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

        this.becomeLeader$.next({
            isLeader: true
        });

        this.applyInterval && this.applyInterval.unsubscribe();
        await this.leaderSignal();

        // signal leadership on interval
        switch (this.electionChannel) {
            case 'broadcast':
                this.signalLeadership = this.bc.$
                    .filter(m => !!this.isLeader)
                    // BUGFIX: avoids loop-hole when for whatever reason 2 are leader
                    .filter(msg => msg.type != 'tell')
                    .subscribe(msg => this.leaderSignal());
                this.subs.push(this.signalLeadership);
                break;
            case 'socket':
                this.signalLeadership = util.Rx.Observable
                    .interval(SIGNAL_TIME)
                    .filter(m => !!this.isLeader)
                    .subscribe(() => this.leaderSignal());
                this.subs.push(this.signalLeadership);
                break;
        }

        // this.die() on unload
        this.unloads.push(
            unload.add(() => {
                this.bc.write('death');
                this.die();
            })
        );
        return true;
    }


    async die() {
        if (!this.isLeader) return false;
        if (this.isDead) return false;
        this.isDead = true;
        this.isLeader = false;

        if (this.signalLeadership)
            this.signalLeadership.unsubscribe();

        // force.write to db
        switch (this.electionChannel) {
            case 'broadcast':
                await this.bc.write('death');
                break;
            case 'socket':
                let success = false;
                while (!success) {
                    try {
                        const leaderObj = await this.getLeaderObject();
                        leaderObj.t = 0;
                        await this.setLeaderObject(leaderObj);
                        success = true;
                    } catch (e) {}
                }
                break;
        }
        return true;
    }

    /**
     * @return {Promise} promise which resolve when the instance becomes leader
     */
    async waitForLeadership() {
        if (this.isLeader) return Promise.resolve(true);

        const subs = [];

        if (!this.isWaiting) {
            this.isWaiting = true;

            // apply now
            this.applyOnce();

            switch (this.electionChannel) {
                case 'broadcast':
                    this.subs.push(
                        this.bc.$
                        .filter(msg => msg.type == 'death')
                        .subscribe(msg => this.applyOnce())
                    );
                    break;
                case 'socket':
                    // apply on interval
                    this.applyInterval = util.Rx.Observable
                        .interval(SIGNAL_TIME * 2)
                        .subscribe(x => this.applyOnce());
                    this.subs.push(this.applyInterval);
                    break;
            }
        }
        return new Promise(res => {
            const sub = this.becomeLeader$
                .asObservable()
                .filter(i => i.isLeader == true)
                .first()
                .subscribe(i => {
                    sub.unsubscribe();
                    res();
                });
        });
    }

    async destroy() {
        this.subs.map(sub => sub.unsubscribe());
        this.unloads.map(fn => fn());
        await this.die();
        this.bc && this.bc.destroy();
    }
}

export async function create(database) {
    const elector = new LeaderElector(database);
    await elector.prepare();
    return elector;
}

export {
    documentID as documentID,
    SIGNAL_TIME as SIGNAL_TIME
};

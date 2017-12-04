/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import unload from 'unload';

import * as util from '../util';
import RxBroadcastChannel from '../rx-broadcast-channel';
import RxError from '../rx-error';

export const documentID = '_local/leader';

import {
    BehaviorSubject
} from 'rxjs/BehaviorSubject';
import {
    filter
} from 'rxjs/operators/filter';
import {
    first
} from 'rxjs/operators/first';


/**
 * This time defines how 'fast' the communication between the instances is.
 * If this time is too low, it's possible that more than one instance becomes leader
 * If this time is too height, the leader-election takes longer than necessary
 * @type {Number} in milliseconds
 */
export const SIGNAL_TIME = 500;

class LeaderElector {
    constructor(database) {
        this.destroyed = false;

        // things that must be cleared on destroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.token = this.database.token;

        this.isLeader = false;
        this.becomeLeader$ = new BehaviorSubject({
            isLeader: false
        });

        this.isDead = false;
        this.isApplying = false;
        this.isWaiting = false;

        this.bc = RxBroadcastChannel.create(this.database, 'leader');
        this.electionChannel = this.bc ? 'broadcast' : 'socket';
    }

    createLeaderObject() {
        return {
            _id: documentID,
            is: '', // token of leader-instance
            apply: '', // token of applying instance
            t: 0 // time when the leader send a signal the last time
        };
    }

    /**
     * returns the leader-document from the _adminPouch
     * @return {Promise<any>} leaderDoc
     */
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

    /**
     * saves the leader-object to the internal adminPouch
     * @param {any} newObj [description]
     * @return {Promise}
     */
    setLeaderObject(newObj) {
        return this.database._adminPouch.put(newObj);
    }


    getApplyFunction(electionChannel) {
        if (electionChannel === 'socket')
            return this.applySocket.bind(this);
        if (electionChannel === 'broadcast')
            return this.applyBroadcast.bind(this);

        throw RxError.newRxError('LE1');
    }

    /**
     * starts applying for leadership
     */
    async applyOnce() {
        if (this.isLeader) return false;
        if (this.isDead) return false;
        if (this.isApplying) return false;
        if (this.destroyed) return false;
        this.isApplying = true;

        const elected = await this.getApplyFunction(this.electionChannel)();

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
    async applySocket() {
        try {
            let leaderObj = await this.getLeaderObject();
            const minTime = new Date().getTime() - SIGNAL_TIME * 2;

            if (leaderObj.t >= minTime)
                throw RxError.newRxError('LE2');
            // write applying to db
            leaderObj.apply = this.token;
            leaderObj.t = new Date().getTime();
            await this.setLeaderObject(leaderObj);

            // w8 one cycle
            await util.promiseWait(SIGNAL_TIME * 0.5);

            // check if someone overwrote it
            leaderObj = await this.getLeaderObject();
            if (leaderObj.apply !== this.token)
                throw RxError.newRxError('LE3');

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * apply via BroadcastChannel-API
     * (better performance than socket)
     */
    async applyBroadcast() {
        const applyTime = new Date().getTime();
        const subs = [];
        const errors = [];

        const whileNoError = async () => {
            subs.push(this.bc.$
                .pipe(
                    filter(() => !!this.isApplying),
                    filter(msg => msg.t >= applyTime),
                    filter(msg => msg.type === 'apply'),
                    filter(msg => {
                        if (
                            msg.data < applyTime ||
                            (
                                msg.data === applyTime &&
                                msg.it > this.token
                            )
                        ) return true;
                        else return false;
                    }),
                    filter(() => errors.length < 1)
                )
                .subscribe(msg => errors.push('other is applying:' + msg.it))
            );
            subs.push(this.bc.$
                .pipe(
                    filter(() => !!this.isApplying),
                    filter(msg => msg.t >= applyTime),
                    filter(msg => msg.type === 'tell'),
                    filter(() => errors.length < 1)
                )
                .subscribe(msg => errors.push('other is leader' + msg.it))
            );
            subs.push(this.bc.$
                .pipe(
                    filter(() => !!this.isApplying),
                    filter(msg => msg.type === 'apply'),
                    filter(msg => {
                        if (
                            msg.data > applyTime ||
                            (
                                msg.data === applyTime &&
                                msg.it > this.token
                            )
                        ) return true;
                        else return false;
                    })
                )
                .subscribe(() => this.bc.write('apply', applyTime))
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
        if (this.destroyed) return;
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

        await this.leaderSignal();

        // signal leadership on interval
        switch (this.electionChannel) {
            case 'broadcast':
                this.signalLeadership = this.bc.$
                    .pipe(
                        filter(() => !!this.isLeader),
                        // BUGFIX: avoids loop-hole when for whatever reason 2 are leader
                        filter(msg => msg.type !== 'tell')
                    )
                    .subscribe(() => this.leaderSignal());
                this.subs.push(this.signalLeadership);
                break;
            case 'socket':
                (async () => {
                    while (!this.destroyed) {
                        await util.promiseWait(SIGNAL_TIME);
                        if (!this.isLeader) return;
                        await this.leaderSignal();
                    }
                })();
                break;
        }

        // this.die() on unload
        this.unloads.push(
            unload.add(() => {
                this.bc && this.bc.write('death');
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

        if (!this.isWaiting) {
            this.isWaiting = true;

            // apply now
            this.applyOnce();

            let fallbackIntervalTime = SIGNAL_TIME * 5;
            switch (this.electionChannel) {
                case 'broadcast':
                    // apply when leader dies
                    this.subs.push(
                        this.bc.$
                        .pipe(
                            filter(msg => msg.type === 'death')
                        )
                        .subscribe(() => this.applyOnce())
                    );
                    break;
                case 'socket':
                    // no message via socket, so just use the interval but set it lower
                    fallbackIntervalTime = SIGNAL_TIME * 2;
                    break;
            }

            // apply on interval incase leader dies without notification
            (async () => {
                while (!this.destroyed && !this.isLeader) {
                    await util.promiseWait(fallbackIntervalTime);

                    switch (this.electionChannel) {
                        case 'broadcast':
                            await util.requestIdlePromise(fallbackIntervalTime);
                            break;
                        case 'socket':
                            await this.database.requestIdlePromise(fallbackIntervalTime);
                            break;
                    }
                    await this.applyOnce();
                }
            })();
        }

        return this.becomeLeader$
            .asObservable()
            .pipe(
                filter(i => i.isLeader === true),
                first()
            )
            .toPromise();
    }

    async destroy() {
        this.destroyed = true;
        this.subs.map(sub => sub.unsubscribe());
        this.unloads.map(fn => fn());
        await this.die();
        this.bc && this.bc.destroy();
    }
}

export function create(database) {
    const elector = new LeaderElector(database);
    return elector;
};

export const rxdb = true;
export const prototypes = {};
export const overwritable = {
    createLeaderElector: create
};

export default {
    rxdb,
    prototypes,
    overwritable
};

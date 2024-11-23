import { RxConflictHandler } from 'rxdb';
import { RxHeroDocumentType } from './hero.schema';

export const conflictHandler: RxConflictHandler<RxHeroDocumentType> = {
    isEqual(a, b) {
        return a.replicationRevision === b.replicationRevision;
    },
    resolve(i) {
        /**
         * The default conflict handler will always
         * drop the fork state and use the master state instead.
         */
        return Promise.resolve(i.realMasterState);
    }
};

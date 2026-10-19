import type { RxConflictHandler, WithDeleted } from 'rxdb';
import type { TodoDocType } from '../shared/schema.ts';

const MERGEABLE_FIELDS = ['title', 'done'] as const;

/**
 * A three-way merge conflict handler.
 *
 * A conflict happens when the client pushes a change but the server
 * already has a newer state of that document, for example because
 * another device edited the same todo while this client was offline.
 *
 * The handler gets three document states:
 * - assumedMasterState: the server state this client based its change on
 * - newDocumentState: the local state that the client wants to push
 * - realMasterState: the state that is really stored on the server
 *
 * For each field it keeps the side that changed it compared to the
 * assumedMasterState. So when one device renames a todo and another
 * device marks it as done, both changes survive.
 * When both sides changed the same field, the newer updatedAt wins.
 * When one side deleted the todo, the deletion wins.
 *
 * The resolved document is written to the local database and
 * then pushed to the server again.
 */
export const todoConflictHandler: RxConflictHandler<TodoDocType> = {
    isEqual(a, b) {
        /**
         * isEqual() is called often and must be fast.
         * Every write sets a new updatedAt, so comparing it
         * together with the deleted flag and the content is enough.
         */
        return a.updatedAt === b.updatedAt &&
            a._deleted === b._deleted &&
            a.title === b.title &&
            a.done === b.done;
    },
    resolve(input) {
        const { assumedMasterState, realMasterState, newDocumentState } = input;

        if (realMasterState._deleted) {
            return Promise.resolve(realMasterState);
        }
        if (newDocumentState._deleted) {
            return Promise.resolve(Object.assign({}, newDocumentState, {
                updatedAt: Math.max(realMasterState.updatedAt, newDocumentState.updatedAt)
            }));
        }

        const localIsNewer = newDocumentState.updatedAt > realMasterState.updatedAt;
        const merged: WithDeleted<TodoDocType> = Object.assign({}, realMasterState);
        for (const field of MERGEABLE_FIELDS) {
            const changedLocally = !assumedMasterState || assumedMasterState[field] !== newDocumentState[field];
            const changedRemotely = !assumedMasterState || assumedMasterState[field] !== realMasterState[field];
            if (changedLocally && (!changedRemotely || localIsNewer)) {
                (merged as any)[field] = newDocumentState[field];
            }
        }
        merged.updatedAt = Math.max(realMasterState.updatedAt, newDocumentState.updatedAt);
        return Promise.resolve(merged);
    }
};

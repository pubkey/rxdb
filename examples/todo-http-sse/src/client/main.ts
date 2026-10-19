import './style.css';
import { addRxPlugin } from 'rxdb';
import { createTodoDatabase, type TodoCollection } from './database.ts';
import { replicateTodos, type TodoReplication } from './replication.ts';
import type { TodoDocType } from '../shared/schema.ts';

/**
 * The server is reached through the Vite proxy (see vite.config.ts),
 * so the client uses the same origin as the page.
 */
const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

function getElement<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) {
        throw new Error('element not found: ' + selector);
    }
    return element;
}

async function run() {
    if (import.meta.env.DEV) {
        /**
         * The dev-mode plugin adds many checks and readable error messages.
         * It slows down the database and must not be used in production.
         */
        const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode');
        addRxPlugin(RxDBDevModePlugin);
    }

    const db = await createTodoDatabase({
        name: 'todos',
        password: 'my-secret-password-for-the-example'
    });
    const replication = replicateTodos(db.todos, SERVER_URL);

    renderTodos(db.todos);
    setupForm(db.todos);
    setupSyncStatus(replication);
}

function renderTodos(collection: TodoCollection) {
    const list = getElement<HTMLUListElement>('#todo-list');
    const counter = getElement<HTMLSpanElement>('#todo-count');

    collection.find({ sort: [{ createdAt: 'asc' }] }).$.subscribe(todos => {
        list.replaceChildren(...todos.map(todo => {
            const li = document.createElement('li');
            li.className = 'todo' + (todo.done ? ' done' : '');
            li.dataset.id = todo.id;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.done;
            checkbox.addEventListener('change', () => {
                todo.incrementalPatch({ done: checkbox.checked, updatedAt: Date.now() });
            });

            const title = document.createElement('span');
            title.className = 'title';
            title.textContent = todo.title;
            title.title = 'Double-click to edit';
            title.addEventListener('dblclick', () => startEditing(li, title, todo));

            const removeButton = document.createElement('button');
            removeButton.className = 'remove';
            removeButton.textContent = '×';
            removeButton.title = 'Delete';
            removeButton.addEventListener('click', () => todo.remove());

            li.append(checkbox, title, removeButton);
            return li;
        }));
        const openCount = todos.filter(todo => !todo.done).length;
        counter.textContent = openCount + ' open, ' + todos.length + ' total';
    });

    getElement('#clear-done').addEventListener('click', () => {
        collection.find({ selector: { done: true } }).remove();
    });
}

function startEditing(
    li: HTMLLIElement,
    title: HTMLSpanElement,
    todo: { title: string; incrementalPatch(patch: Partial<TodoDocType>): Promise<unknown>; }
) {
    const input = document.createElement('input');
    input.className = 'edit';
    input.value = todo.title;
    li.replaceChild(input, title);
    input.focus();
    let finished = false;
    const finish = (save: boolean) => {
        if (finished) {
            return;
        }
        finished = true;
        const newTitle = input.value.trim();
        if (save && newTitle && newTitle !== todo.title) {
            /**
             * The query subscription re-renders the list after the write.
             */
            todo.incrementalPatch({ title: newTitle, updatedAt: Date.now() });
        } else {
            li.replaceChild(title, input);
        }
    };
    input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') {
            finish(true);
        } else if (ev.key === 'Escape') {
            finish(false);
        }
    });
    input.addEventListener('blur', () => finish(true));
}

function setupForm(collection: TodoCollection) {
    const form = getElement<HTMLFormElement>('#new-todo-form');
    const input = getElement<HTMLInputElement>('#new-todo');
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const title = input.value.trim();
        if (!title) {
            return;
        }
        const now = Date.now();
        await collection.insert({
            id: crypto.randomUUID(),
            title,
            done: false,
            createdAt: now,
            updatedAt: now
        });
        input.value = '';
    });
}

function setupSyncStatus(replication: TodoReplication) {
    const status = getElement<HTMLSpanElement>('#sync-status');
    const toggle = getElement<HTMLButtonElement>('#toggle-sync');
    const log = getElement<HTMLUListElement>('#conflict-log');
    let lastError: string | undefined;

    const updateStatus = (active: boolean) => {
        if (replication.isPaused()) {
            status.textContent = 'offline (paused)';
            status.className = 'status offline';
        } else if (lastError) {
            status.textContent = 'error: ' + lastError;
            status.className = 'status error';
        } else {
            status.textContent = active ? 'syncing...' : 'in sync';
            status.className = 'status online';
        }
    };

    replication.active$.subscribe(active => {
        if (active) {
            lastError = undefined;
        }
        updateStatus(active);
    });
    replication.error$.subscribe(err => {
        lastError = err.message.split('\n')[0];
        console.error('replication error', err);
        updateStatus(false);
    });

    /**
     * Pausing the replication simulates an offline device.
     * Edit the same todo here and in a second browser profile,
     * then go online again to see the conflict handler merge both changes.
     */
    toggle.addEventListener('click', async () => {
        if (replication.isPaused()) {
            toggle.textContent = 'Go offline';
            await replication.start();
            await replication.reSync();
        } else {
            toggle.textContent = 'Go online';
            await replication.pause();
        }
        updateStatus(false);
    });

    replication.conflict$.subscribe(conflict => {
        const li = document.createElement('li');
        li.textContent = new Date().toLocaleTimeString() + ': conflict on "' +
            conflict.input.realMasterState.title + '" resolved to "' +
            conflict.output.title + '" (done: ' + conflict.output.done + ')';
        log.prepend(li);
    });
}

run().catch(err => {
    console.error(err);
    getElement('#sync-status').textContent = 'failed to start: ' + err.message;
});

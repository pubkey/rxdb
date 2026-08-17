import assert from 'assert';
import {
    analyzeViewerDocuments,
    buildViewerWillRun,
    colorViewerJson,
    createDumpDataSource,
    diffViewerJson,
    formatByteSize,
    formatInteger,
    formatTimeAgo,
    matchesViewerSelector,
    mountRxDBViewer,
    parseViewerSelector,
    relaxViewerSelectorInput,
    shortRev,
    viewerTypeOf
} from '../../plugins/dbviewer/index.mjs';

describe('dbviewer.test.ts', () => {
    describe('.viewerTypeOf()', () => {
        it('should detect all types', () => {
            assert.strictEqual(viewerTypeOf('foo'), 'string');
            assert.strictEqual(viewerTypeOf(42), 'number');
            assert.strictEqual(viewerTypeOf(false), 'boolean');
            assert.strictEqual(viewerTypeOf([1, 2]), 'array');
            assert.strictEqual(viewerTypeOf({ a: 1 }), 'object');
            assert.strictEqual(viewerTypeOf(null), 'null');
            assert.strictEqual(viewerTypeOf(undefined), 'null');
        });
    });
    describe('.parseViewerSelector()', () => {
        it('should parse a valid selector', () => {
            const result = parseViewerSelector('{ "done": false }');
            assert.deepStrictEqual(result.selector, { done: false });
            assert.strictEqual(typeof result.error, 'undefined');
        });
        it('empty input equals match-all', () => {
            const result = parseViewerSelector('   ');
            assert.deepStrictEqual(result.selector, {});
        });
        it('should return an error with a position on invalid JSON', () => {
            const result = parseViewerSelector('{ "done": nope }');
            assert.ok(result.error);
            assert.ok(result.error.message.includes('valid JSON'));
            assert.strictEqual(typeof result.error.position, 'number');
        });
        it('should reject non-object selectors', () => {
            const result = parseViewerSelector('[1,2]');
            assert.ok(result.error);
        });
        it('should accept relaxed javascript object syntax', () => {
            assert.deepStrictEqual(parseViewerSelector('{ name: "foo" }').selector, { name: 'foo' });
            assert.deepStrictEqual(parseViewerSelector('{ name: \'foo\', done: true, }').selector, { name: 'foo', done: true });
            assert.deepStrictEqual(parseViewerSelector('{ age: { $gt: 10 } }').selector, { age: { $gt: 10 } });
            assert.deepStrictEqual(parseViewerSelector('{ owner.id: "u_1" }').selector, { 'owner.id': 'u_1' });
            assert.deepStrictEqual(parseViewerSelector('{ tags: [\'a\', \'b\',] }').selector, { tags: ['a', 'b'] });
        });
        it('relaxed parsing must not touch string contents', () => {
            assert.deepStrictEqual(
                parseViewerSelector('{ url: "http://x, y:z" }').selector,
                { url: 'http://x, y:z' }
            );
        });
        it('should still error on broken relaxed input', () => {
            assert.ok(parseViewerSelector('{ name: }').error);
        });
    });
    describe('.relaxViewerSelectorInput()', () => {
        it('quotes keys, converts quotes and drops trailing commas', () => {
            assert.strictEqual(relaxViewerSelectorInput('{name: \'a\',}'), '{"name": "a"}');
            assert.strictEqual(relaxViewerSelectorInput('{a: true, b: [1, 2,]}'), '{"a": true, "b": [1, 2]}');
        });
        it('keeps already valid JSON unchanged', () => {
            const input = '{ "done": false, "tags": ["work"] }';
            assert.strictEqual(relaxViewerSelectorInput(input), input);
        });
    });
    describe('.matchesViewerSelector()', () => {
        const doc = {
            id: 'a1',
            done: false,
            age: 12,
            tags: ['work', 'home'],
            owner: { id: 'u_102' }
        };
        it('equality and dot paths', () => {
            assert.strictEqual(matchesViewerSelector(doc, { done: false }), true);
            assert.strictEqual(matchesViewerSelector(doc, { done: true }), false);
            assert.strictEqual(matchesViewerSelector(doc, { 'owner.id': 'u_102' }), true);
        });
        it('comparison operators', () => {
            assert.strictEqual(matchesViewerSelector(doc, { age: { $gt: 10 } }), true);
            assert.strictEqual(matchesViewerSelector(doc, { age: { $lt: 10 } }), false);
            assert.strictEqual(matchesViewerSelector(doc, { age: { $gte: 12, $lte: 12 } }), true);
        });
        it('$in on arrays and scalars', () => {
            assert.strictEqual(matchesViewerSelector(doc, { tags: { $in: ['work'] } }), true);
            assert.strictEqual(matchesViewerSelector(doc, { id: { $in: ['a1', 'b2'] } }), true);
            assert.strictEqual(matchesViewerSelector(doc, { tags: { $in: ['nope'] } }), false);
        });
        it('array contains scalar', () => {
            assert.strictEqual(matchesViewerSelector(doc, { tags: 'work' }), true);
        });
        it('$exists, $regex, $or', () => {
            assert.strictEqual(matchesViewerSelector(doc, { missing: { $exists: false } }), true);
            assert.strictEqual(matchesViewerSelector(doc, { id: { $regex: '^a' } }), true);
            assert.strictEqual(matchesViewerSelector(doc, { $or: [{ done: true }, { age: 12 }] }), true);
        });
    });
    describe('.analyzeViewerDocuments()', () => {
        const docs = [
            { id: 'a', title: 'foo', done: true, priority: 1 },
            { id: 'b', title: 'bar', done: false, priority: 'high' },
            { id: 'c', title: 'baz', done: false }
        ];
        const jsonSchema = {
            properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                done: { type: 'boolean' },
                priority: { type: 'number' }
            },
            required: ['id', 'title', 'owner']
        };
        it('computes presence and type shares', () => {
            const analysis = analyzeViewerDocuments(docs, undefined, 'id');
            assert.strictEqual(analysis.sampled, 3);
            const priority = analysis.fields.find(f => f.name === 'priority');
            assert.ok(priority);
            assert.strictEqual(priority.presence, 67);
            const types = priority.types.map(t => t.type).sort();
            assert.deepStrictEqual(types, ['missing', 'number', 'string']);
        });
        it('collects schema violations with exact messages', () => {
            const analysis = analyzeViewerDocuments(docs, jsonSchema, 'id');
            const typeViolation = analysis.violations.find(v => v.id === 'b' && v.message.includes('priority'));
            assert.ok(typeViolation);
            assert.strictEqual(typeViolation.message, 'priority: expected number, got string "high"');
            const requiredViolation = analysis.violations.find(v => v.message === 'required field owner is missing');
            assert.ok(requiredViolation);
        });
    });
    describe('.diffViewerJson()', () => {
        it('marks changed lines as removed and added', () => {
            const before = { id: 'a1', title: 'Buy milk', done: false };
            const after = { id: 'a1', title: 'Buy milk (2%)', done: false };
            const diff = diffViewerJson(before, after);
            const removed = diff.filter(line => line.kind === 'removed');
            const added = diff.filter(line => line.kind === 'added');
            assert.strictEqual(removed.length, 1);
            assert.strictEqual(added.length, 1);
            assert.ok(removed[0].text.includes('Buy milk'));
            assert.ok(added[0].text.includes('Buy milk (2%)'));
            assert.ok(diff.some(line => line.kind === 'same' && line.text.includes('"done"')));
        });
        it('handles inserts with no previous document', () => {
            const diff = diffViewerJson(null, { id: 'x' });
            assert.ok(diff.every(line => line.kind === 'added'));
        });
    });
    describe('.buildViewerWillRun()', () => {
        it('previews the exact upsert call with changed lines marked', () => {
            const lines = buildViewerWillRun('mydb', 'todos', { id: 'a1b2c3', title: 'Buy milk (2%)', done: false }, ['title']);
            assert.strictEqual(lines[0].text, 'await mydb.todos.upsert({');
            assert.strictEqual(lines[lines.length - 1].text, '})');
            const changed = lines.filter(line => line.changed);
            assert.strictEqual(changed.length, 1);
            assert.ok(changed[0].text.includes('"title"'));
        });
        it('marks all lines of a changed nested field', () => {
            const lines = buildViewerWillRun('mydb', 'todos', { id: 'a', owner: { id: 'u_1', name: 'Anna' } }, ['owner']);
            const changed = lines.filter(line => line.changed);
            assert.ok(changed.length >= 3);
        });
        it('supports insert operations', () => {
            const lines = buildViewerWillRun('mydb', 'todos', { id: 'a' }, [], 'insert');
            assert.strictEqual(lines[0].text, 'await mydb.todos.insert({');
        });
    });
    describe('formatting helpers', () => {
        it('formatByteSize', () => {
            assert.strictEqual(formatByteSize(0), '—');
            assert.strictEqual(formatByteSize(500), '500 B');
            assert.strictEqual(formatByteSize(2048), '2.0 KB');
            assert.strictEqual(formatByteSize(3.5 * 1024 * 1024), '3.5 MB');
        });
        it('formatInteger', () => {
            assert.strictEqual(formatInteger(1204), '1,204');
        });
        it('shortRev', () => {
            assert.strictEqual(shortRev('1-9f2a4cabcdef'), '1-9f2a');
            assert.strictEqual(shortRev(undefined), '—');
        });
        it('formatTimeAgo', () => {
            const now = Date.now();
            assert.strictEqual(formatTimeAgo(now - 5000, now), '5s ago');
            assert.strictEqual(formatTimeAgo(now - 4 * 60 * 1000, now), '4m ago');
            assert.strictEqual(formatTimeAgo(now - 25 * 60 * 60 * 1000, now), 'yesterday');
        });
        it('colorViewerJson escapes html', () => {
            const html = colorViewerJson({ title: '<script>' });
            assert.ok(!html.includes('<script>'));
            assert.ok(html.includes('&lt;script&gt;'));
        });
    });
    describe('.createDumpDataSource()', () => {
        const dump = {
            name: 'mydb',
            collections: [
                {
                    name: 'todos',
                    docs: [
                        { id: 'a1', title: 'foo', done: false },
                        { id: 'b2', title: 'bar', done: true }
                    ]
                }
            ]
        };
        it('lists, counts and queries', async () => {
            const source = createDumpDataSource(dump, 'mydb-2026-08-05.json');
            assert.strictEqual(source.kind, 'dump');
            assert.strictEqual(source.readOnly, true);
            const collections = source.listCollections();
            assert.strictEqual(collections.length, 1);
            assert.strictEqual(collections[0].primaryPath, 'id');
            assert.strictEqual(await source.count('todos'), 2);
            const result = await source.query('todos', { done: true }, 0, 100);
            assert.strictEqual(result.total, 1);
            assert.strictEqual(result.docs[0].id, 'b2');
            const byId = await source.getById('todos', 'a1');
            assert.strictEqual(byId.title, 'foo');
        });
        it('rejects writes', async () => {
            const source = createDumpDataSource(dump);
            await assert.rejects(() => source.upsert('todos', { id: 'x' }));
            await assert.rejects(() => source.removeByIds('todos', ['a1']));
        });
    });
    describe('.mountRxDBViewer()', () => {
        it('throws DVW1 outside of a browser environment', () => {
            if (typeof document !== 'undefined') {
                return;
            }
            assert.throws(
                () => mountRxDBViewer({ dump: { name: 'x', collections: [] } }),
                (err: any) => err.code === 'DVW1'
            );
        });
    });
});

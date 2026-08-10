import assert from 'assert';

import config from './config.ts';
import {
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
import {
    DEVTOOL_COLORS,
    METRICS_BUCKET_COUNT,
    METRICS_BUCKET_MS,
    RollingWindow,
    diffJson,
    formatBytes,
    getByPath,
    mountRxDBDevtool,
    parseCellInput,
    parseSelector,
    setByPath,
    shortRevision,
    valueType
} from '../../plugins/devtool/index.mjs';
import { schemas } from '../../plugins/test-utils/index.mjs';

describe('devtool.test.ts', () => {
    describe('RollingWindow', () => {
        it('should sum only the events inside the window', () => {
            const start = 1000000;
            const window = new RollingWindow(start);
            window.add(start);
            window.add(start + 1);
            window.add(start + METRICS_BUCKET_MS);
            assert.strictEqual(window.total(start + METRICS_BUCKET_MS), 3);
        });
        it('should drop events that fell out of the window', () => {
            const start = 1000000;
            const window = new RollingWindow(start);
            window.add(start, 5);
            const afterWindow = start + (METRICS_BUCKET_MS * METRICS_BUCKET_COUNT) + METRICS_BUCKET_MS;
            assert.strictEqual(window.total(afterWindow), 0);
        });
        it('should return the series oldest bucket first', () => {
            const start = 1000000;
            const window = new RollingWindow(start);
            window.add(start, 2);
            const now = start + METRICS_BUCKET_MS;
            window.add(now, 7);
            const series = window.series(now);
            assert.strictEqual(series.length, METRICS_BUCKET_COUNT);
            assert.strictEqual(series[METRICS_BUCKET_COUNT - 1], 7);
            assert.strictEqual(series[METRICS_BUCKET_COUNT - 2], 2);
        });
        it('should not keep stale counts when many buckets are skipped', () => {
            const start = 1000000;
            const window = new RollingWindow(start);
            window.add(start, 3);
            const later = start + (METRICS_BUCKET_MS * 3);
            window.add(later, 1);
            assert.strictEqual(window.total(later), 4);
            const muchLater = later + (METRICS_BUCKET_MS * METRICS_BUCKET_COUNT);
            assert.strictEqual(window.total(muchLater), 0);
        });
    });
    describe('selector parsing', () => {
        it('should treat an empty input as the match-all selector', () => {
            const parsed = parseSelector('   ');
            assert.ok(parsed.ok);
            assert.deepStrictEqual((parsed as any).value, {});
        });
        it('should point the caret at the broken token', () => {
            const input = '{ "done": undefined }';
            const parsed = parseSelector(input);
            assert.strictEqual(parsed.ok, false);
            assert.strictEqual((parsed as any).error.position, input.indexOf('undefined'));
            assert.ok((parsed as any).error.message.includes('valid JSON'));
        });
        it('should not mistake a quoted value for a broken token', () => {
            const parsed = parseSelector('{ "owner.id": "u_102" }');
            assert.ok(parsed.ok);
        });
        it('should refuse a selector that is not an object', () => {
            const parsed = parseSelector('[1, 2]');
            assert.strictEqual(parsed.ok, false);
        });
    });
    describe('value helpers', () => {
        it('should read and write nested paths', () => {
            const documentData: any = { owner: { name: 'Anna' } };
            assert.strictEqual(getByPath(documentData, 'owner.name'), 'Anna');
            assert.strictEqual(getByPath(documentData, 'owner.missing.deep'), undefined);
            setByPath(documentData, 'owner.id', 'u_102');
            assert.strictEqual(documentData.owner.id, 'u_102');
        });
        it('should keep plain text edits of string fields as strings', () => {
            assert.strictEqual(parseCellInput('Buy milk (2%)', 'Buy milk'), 'Buy milk (2%)');
            assert.strictEqual(parseCellInput('42', 1), 42);
            assert.strictEqual(parseCellInput('false', true), false);
        });
        it('should name the type of a value', () => {
            assert.strictEqual(valueType(undefined), 'missing');
            assert.strictEqual(valueType(null), 'null');
            assert.strictEqual(valueType([1]), 'array');
            assert.strictEqual(valueType({}), 'object');
            assert.strictEqual(valueType('a'), 'string');
        });
        it('should shorten revisions and format bytes', () => {
            assert.strictEqual(shortRevision('1-9f2a4c1234'), '1-9f2a4c');
            assert.strictEqual(formatBytes(512), '512 B');
            assert.strictEqual(formatBytes(1024 * 1024), '1 MB');
        });
    });
    describe('diff', () => {
        it('should mark the changed line as removed and added', () => {
            const lines = diffJson(
                { id: 'a1b2c3', title: 'Buy milk' },
                { id: 'a1b2c3', title: 'Buy milk (2%)' }
            );
            const removed = lines.filter(line => line.kind === 'removed');
            const added = lines.filter(line => line.kind === 'added');
            assert.strictEqual(removed.length, 1);
            assert.strictEqual(added.length, 1);
            assert.ok(removed[0].text.includes('Buy milk'));
            assert.ok(added[0].text.includes('Buy milk (2%)'));
            assert.ok(lines.some(line => line.kind === 'context' && line.text.includes('a1b2c3')));
        });
        it('should mark every line of a deleted document as removed', () => {
            const lines = diffJson({ id: 'a1b2c3' }, undefined);
            assert.ok(lines.length > 0);
            assert.ok(lines.every(line => line.kind === 'removed'));
        });
    });
    describe('design tokens', () => {
        it('should use the rxdb.info brand colors', () => {
            assert.strictEqual(DEVTOOL_COLORS.pink, '#ED168F');
            assert.strictEqual(DEVTOOL_COLORS.purpleDeep, '#27022D');
            assert.strictEqual(DEVTOOL_COLORS.bgDark, '#0D0F18');
        });
    });
    describe('mountRxDBDevtool()', () => {
        it('should throw a readable error when there is no DOM', async () => {
            if (typeof document !== 'undefined') {
                return;
            }
            const database = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            await database.addCollections({
                humans: { schema: schemas.human }
            });
            assert.throws(
                () => mountRxDBDevtool(database),
                (error: any) => error.code === 'DVT1'
            );
            await database.close();
        });
    });
});

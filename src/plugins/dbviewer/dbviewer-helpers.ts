import type {
    ViewerChangeEntry,
    ViewerDiffLine,
    ViewerFieldAnalysis,
    ViewerFieldType,
    ViewerFieldTypeShare,
    ViewerSchemaAnalysis,
    ViewerSchemaViolation,
    ViewerSelectorParseResult,
    ViewerWillRunLine
} from './dbviewer-types.ts';

export const VIEWER_INTERNAL_FIELDS = ['_rev', '_deleted', '_meta', '_attachments'];

export function viewerTypeOf(value: any): ViewerFieldType {
    if (value === null || typeof value === 'undefined') {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    const t = typeof value;
    if (t === 'string') {
        return 'string';
    }
    if (t === 'number') {
        return 'number';
    }
    if (t === 'boolean') {
        return 'boolean';
    }
    return 'object';
}

export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function formatInteger(n: number): string {
    return n.toLocaleString('en-US');
}

export function formatByteSize(bytes: number): string {
    if (bytes === 0) {
        return '—';
    }
    if (bytes < 1024) {
        return bytes + ' B';
    }
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function formatTimeAgo(msTimestamp: number, now = Date.now()): string {
    const diff = Math.max(0, now - msTimestamp);
    if (diff < 3 * 1000) {
        return 'just now';
    }
    if (diff < 60 * 1000) {
        return Math.floor(diff / 1000) + 's ago';
    }
    if (diff < 60 * 60 * 1000) {
        return Math.floor(diff / (60 * 1000)) + 'm ago';
    }
    if (diff < 24 * 60 * 60 * 1000) {
        return Math.floor(diff / (60 * 60 * 1000)) + 'h ago';
    }
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 1) {
        return 'yesterday';
    }
    return days + 'd ago';
}

export function formatClockTime(msTimestamp: number, withMillis = false): string {
    const d = new Date(msTimestamp);
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const base = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    if (withMillis) {
        return base + '.' + pad(d.getMilliseconds(), 3);
    }
    return base;
}

export function shortRev(rev?: string): string {
    if (!rev) {
        return '—';
    }
    const split = rev.split('-');
    if (split.length < 2) {
        return rev;
    }
    return split[0] + '-' + split[1].slice(0, 4);
}

/**
 * Parses the Mango selector input of the query bar.
 * An empty input equals the match-all selector.
 * On invalid JSON the character position of the error
 * is extracted so the caret marker can be drawn.
 */
export function parseViewerSelector(input: string): ViewerSelectorParseResult {
    const trimmed = input.trim();
    if (trimmed === '') {
        return { selector: {} };
    }
    try {
        const parsed = JSON.parse(trimmed);
        if (viewerTypeOf(parsed) !== 'object') {
            return {
                error: {
                    message: 'The selector must be a JSON object',
                    position: 0
                }
            };
        }
        return { selector: parsed };
    } catch (err: any) {
        const message: string = err && err.message ? err.message : 'Invalid JSON';
        const positionMatch = message.match(/position (\d+)/);
        const position = positionMatch ? parseInt(positionMatch[1], 10) : 0;
        return {
            error: {
                message: message + ' — the selector must be valid JSON',
                position
            }
        };
    }
}

function resolvePath(doc: any, path: string): any {
    const parts = path.split('.');
    let current = doc;
    for (const part of parts) {
        if (current === null || typeof current === 'undefined') {
            return undefined;
        }
        current = current[part];
    }
    return current;
}

function compareValues(a: any, b: any): number {
    if (a === b) {
        return 0;
    }
    if (typeof a === 'number' && typeof b === 'number') {
        return a < b ? -1 : 1;
    }
    return String(a) < String(b) ? -1 : 1;
}

function matchOperator(value: any, operator: string, operand: any): boolean {
    switch (operator) {
        case '$eq':
            return deepEquals(value, operand);
        case '$ne':
            return !deepEquals(value, operand);
        case '$gt':
            return typeof value !== 'undefined' && compareValues(value, operand) > 0;
        case '$gte':
            return typeof value !== 'undefined' && compareValues(value, operand) >= 0;
        case '$lt':
            return typeof value !== 'undefined' && compareValues(value, operand) < 0;
        case '$lte':
            return typeof value !== 'undefined' && compareValues(value, operand) <= 0;
        case '$in':
            if (!Array.isArray(operand)) {
                return false;
            }
            if (Array.isArray(value)) {
                return value.some(v => operand.some(o => deepEquals(v, o)));
            }
            return operand.some(o => deepEquals(value, o));
        case '$nin':
            return !matchOperator(value, '$in', operand);
        case '$exists':
            return operand ? typeof value !== 'undefined' : typeof value === 'undefined';
        case '$regex':
            return typeof value === 'string' && new RegExp(operand).test(value);
        default:
            return false;
    }
}

export function deepEquals(a: any, b: any): boolean {
    if (a === b) {
        return true;
    }
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
        return false;
    }
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Minimal Mango selector matcher used in dump mode
 * where no live database is available to run queries.
 * Supports equality, $eq, $ne, $gt, $gte, $lt, $lte,
 * $in, $nin, $exists, $regex, $and, $or and dot paths.
 */
export function matchesViewerSelector(doc: any, selector: any): boolean {
    if (!selector) {
        return true;
    }
    return Object.entries(selector).every(([key, condition]) => {
        if (key === '$and') {
            return Array.isArray(condition) && (condition as any[]).every(sub => matchesViewerSelector(doc, sub));
        }
        if (key === '$or') {
            return Array.isArray(condition) && (condition as any[]).some(sub => matchesViewerSelector(doc, sub));
        }
        if (key === '$nor') {
            return Array.isArray(condition) && !(condition as any[]).some(sub => matchesViewerSelector(doc, sub));
        }
        const value = resolvePath(doc, key);
        if (
            condition !== null &&
            typeof condition === 'object' &&
            !Array.isArray(condition) &&
            Object.keys(condition as object).some(k => k.startsWith('$'))
        ) {
            return Object.entries(condition as object).every(([operator, operand]) => matchOperator(value, operator, operand));
        }
        if (Array.isArray(value) && !Array.isArray(condition)) {
            return value.some(v => deepEquals(v, condition));
        }
        return deepEquals(value, condition);
    });
}

function stringDetail(values: string[], isPrimary: boolean): string {
    const lengths = values.map(v => v.length);
    const avg = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
    const max = lengths.reduce((a, b) => Math.max(a, b), 0);
    const unique = new Set(values).size === values.length;
    const parts: string[] = [];
    if (isPrimary || unique) {
        parts.push(unique ? 'unique' : 'not unique');
    }
    parts.push('avg length ' + Math.round(avg) + ' chars · max ' + max);
    const sorted = values.slice().sort();
    if (values.length > 0 && looksLikeDate(sorted[0])) {
        parts.push('min ' + sorted[0] + ' · max ' + sorted[sorted.length - 1]);
    }
    return parts.join(' · ');
}

function looksLikeDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function histogramBar(share: number): string {
    const blocks = Math.max(1, Math.round(share * 10));
    return '▓'.repeat(blocks);
}

/**
 * Analyzes sampled documents into per-field type shares,
 * presence percentages and value details for the schema panel.
 * When a jsonSchema is given, violations against its declared
 * top-level types and required fields are collected.
 */
export function analyzeViewerDocuments(
    docs: any[],
    jsonSchema?: any,
    primaryPath?: string
): ViewerSchemaAnalysis {
    const sampled = docs.length;
    const fieldNames: string[] = [];
    const seen = new Set<string>();
    docs.forEach(doc => {
        Object.keys(doc || {}).forEach(key => {
            if (VIEWER_INTERNAL_FIELDS.includes(key)) {
                return;
            }
            if (!seen.has(key)) {
                seen.add(key);
                fieldNames.push(key);
            }
        });
    });

    const fields: ViewerFieldAnalysis[] = fieldNames.map(name => {
        const typeCounts = new Map<ViewerFieldType, number>();
        let present = 0;
        const stringValues: string[] = [];
        const numberValues: number[] = [];
        let trueCount = 0;
        let boolCount = 0;
        let arrayItemSum = 0;
        let arrayCount = 0;
        const arrayItemCounts = new Map<string, number>();
        const objectKeys = new Set<string>();

        docs.forEach(doc => {
            const value = doc ? doc[name] : undefined;
            if (typeof value === 'undefined') {
                addCount(typeCounts, 'missing');
                return;
            }
            present = present + 1;
            const type = viewerTypeOf(value);
            addCount(typeCounts, type);
            if (type === 'string') {
                stringValues.push(value);
            } else if (type === 'number') {
                numberValues.push(value);
            } else if (type === 'boolean') {
                boolCount = boolCount + 1;
                if (value === true) {
                    trueCount = trueCount + 1;
                }
            } else if (type === 'array') {
                arrayCount = arrayCount + 1;
                arrayItemSum = arrayItemSum + value.length;
                value.forEach((item: any) => {
                    if (typeof item === 'string') {
                        arrayItemCounts.set(item, (arrayItemCounts.get(item) || 0) + 1);
                    }
                });
            } else if (type === 'object') {
                Object.keys(value).forEach(k => objectKeys.add(k));
            }
        });

        const types: ViewerFieldTypeShare[] = Array.from(typeCounts.entries())
            .map(([type, count]) => ({
                type,
                share: sampled === 0 ? 0 : count / sampled
            }))
            .sort((a, b) => {
                if (a.type === 'missing' || b.type === 'missing') {
                    return a.type === 'missing' ? 1 : -1;
                }
                return b.share - a.share;
            });

        const presence = sampled === 0 ? 0 : Math.round((present / sampled) * 100);
        const detailParts: string[] = [];
        const dominantType = types.length > 0 ? types[0].type : 'missing';
        if (types.filter(t => t.type !== 'missing').length > 1) {
            detailParts.push('mixed types');
        }
        if (stringValues.length > 0 && (dominantType === 'string' || stringValues.length >= present / 2)) {
            detailParts.push(stringDetail(stringValues, name === primaryPath));
        } else if (boolCount > 0) {
            const trueShare = trueCount / boolCount;
            const falseShare = 1 - trueShare;
            detailParts.push(
                'false ' + Math.round(falseShare * 100) + '% ' + histogramBar(falseShare) +
                ' · true ' + Math.round(trueShare * 100) + '% ' + histogramBar(trueShare)
            );
        } else if (numberValues.length > 0) {
            detailParts.push('min ' + Math.min(...numberValues) + ' · max ' + Math.max(...numberValues));
        } else if (arrayCount > 0) {
            const avgItems = (arrayItemSum / arrayCount).toFixed(1);
            const top = Array.from(arrayItemCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([value, count]) => '"' + value + '" ' + count);
            detailParts.push('avg ' + avgItems + ' items' + (top.length > 0 ? ' · top: ' + top.join(', ') : ''));
        } else if (objectKeys.size > 0) {
            detailParts.push('keys: ' + Array.from(objectKeys).slice(0, 6).join(', '));
        }

        return {
            name,
            presence,
            types,
            detail: detailParts.join(' — ')
        };
    });

    const violations: ViewerSchemaViolation[] = [];
    if (jsonSchema && jsonSchema.properties) {
        const required: string[] = jsonSchema.required || [];
        docs.forEach(doc => {
            if (!doc) {
                return;
            }
            const id = primaryPath ? String(doc[primaryPath]) : '?';
            required.forEach(requiredField => {
                if (typeof doc[requiredField] === 'undefined' && violations.length < 100) {
                    violations.push({
                        id,
                        message: 'required field ' + requiredField + ' is missing'
                    });
                }
            });
            Object.entries(jsonSchema.properties).forEach(([propName, propSchema]: [string, any]) => {
                const value = doc[propName];
                if (typeof value === 'undefined' || !propSchema || !propSchema.type) {
                    return;
                }
                const declared: string[] = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
                const actual = viewerTypeOf(value);
                const matches = declared.some(declaredType => {
                    if (declaredType === 'integer') {
                        return actual === 'number' && Number.isInteger(value);
                    }
                    return declaredType === actual;
                });
                if (!matches && violations.length < 100) {
                    const shown = actual === 'string' ? 'string "' + value + '"' : actual + ' ' + JSON.stringify(value);
                    violations.push({
                        id,
                        message: propName + ': expected ' + declared.join(' or ') + ', got ' + shown
                    });
                }
            });
        });
    }

    return {
        sampled,
        fields,
        violations
    };
}

function addCount(map: Map<ViewerFieldType, number>, type: ViewerFieldType) {
    map.set(type, (map.get(type) || 0) + 1);
}

/**
 * Line based diff of two pretty printed JSON documents,
 * computed with a classic longest-common-subsequence table.
 * Documents in the changes feed are small, so the quadratic
 * table stays cheap.
 */
export function diffViewerJson(before: any, after: any): ViewerDiffLine[] {
    const beforeLines = before ? JSON.stringify(before, null, 2).split('\n') : [];
    const afterLines = after ? JSON.stringify(after, null, 2).split('\n') : [];
    const n = beforeLines.length;
    const m = afterLines.length;
    const table: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            if (beforeLines[i] === afterLines[j]) {
                table[i][j] = table[i + 1][j + 1] + 1;
            } else {
                table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
            }
        }
    }
    const result: ViewerDiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (beforeLines[i] === afterLines[j]) {
            result.push({ kind: 'same', text: beforeLines[i] });
            i = i + 1;
            j = j + 1;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
            result.push({ kind: 'removed', text: beforeLines[i] });
            i = i + 1;
        } else {
            result.push({ kind: 'added', text: afterLines[j] });
            j = j + 1;
        }
    }
    while (i < n) {
        result.push({ kind: 'removed', text: beforeLines[i] });
        i = i + 1;
    }
    while (j < m) {
        result.push({ kind: 'added', text: afterLines[j] });
        j = j + 1;
    }
    return result;
}

/**
 * Builds the WILL RUN preview of the drawer: the exact
 * call that Apply changes would execute, with the lines
 * that belong to changed top-level fields marked.
 */
export function buildViewerWillRun(
    databaseName: string,
    collectionName: string,
    doc: any,
    changedFields: string[],
    operation: 'upsert' | 'insert' | 'remove' = 'upsert'
): ViewerWillRunLine[] {
    const lines: ViewerWillRunLine[] = [];
    if (operation === 'remove') {
        lines.push({
            text: 'await ' + databaseName + '.' + collectionName + '.findOne(' + JSON.stringify(doc) + ').remove()',
            changed: false
        });
        return lines;
    }
    const json = JSON.stringify(doc, null, 2);
    const jsonLines = json.split('\n');
    lines.push({
        text: 'await ' + databaseName + '.' + collectionName + '.' + operation + '({',
        changed: false
    });
    let currentField = '';
    jsonLines.forEach((line, index) => {
        if (index === 0 || index === jsonLines.length - 1) {
            return;
        }
        const fieldMatch = line.match(/^ {2}"([^"]+)":/);
        if (fieldMatch) {
            currentField = fieldMatch[1];
        }
        lines.push({
            text: line,
            changed: changedFields.includes(currentField)
        });
    });
    lines.push({ text: '})', changed: false });
    return lines;
}

/**
 * Pretty prints a JSON value with syntax colors for the JSON view.
 * Returns an HTML string; all raw values are escaped.
 */
export function colorViewerJson(value: any, indent = 0): string {
    const pad = '  '.repeat(indent);
    const type = viewerTypeOf(value);
    switch (type) {
        case 'string':
            return '<span class="rxdbv-json-str">"' + escapeHtml(value) + '"</span>';
        case 'number':
        case 'boolean':
            return '<span class="rxdbv-json-num">' + String(value) + '</span>';
        case 'null':
            return '<span class="rxdbv-json-num">null</span>';
        case 'array': {
            if (value.length === 0) {
                return '[]';
            }
            const items = value.map((item: any) => pad + '  ' + colorViewerJson(item, indent + 1));
            return '[\n' + items.join(',\n') + '\n' + pad + ']';
        }
        default: {
            const keys = Object.keys(value);
            if (keys.length === 0) {
                return '{}';
            }
            const items = keys.map(key => {
                return pad + '  <span class="rxdbv-json-key">"' + escapeHtml(key) + '"</span>: ' + colorViewerJson(value[key], indent + 1);
            });
            return '{\n' + items.join(',\n') + '\n' + pad + '}';
        }
    }
}

export function changeEntryFromEvent(event: any): ViewerChangeEntry {
    return {
        time: Date.now(),
        operation: event.operation,
        collectionName: event.collectionName || '?',
        documentId: String(event.documentId),
        revFrom: event.previousDocumentData ? event.previousDocumentData._rev : undefined,
        revTo: event.documentData ? event.documentData._rev : undefined,
        documentData: event.documentData,
        previousDocumentData: event.previousDocumentData
    };
}

export function documentByteSize(doc: any): number {
    try {
        return JSON.stringify(doc).length;
    } catch (err) {
        return 0;
    }
}

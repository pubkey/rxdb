import type { RxJsonSchema } from '../../src/types/index.d.ts';

export type GridColumn = {
    path: string;
    label: string;
    width: string;
};

const INTERNAL_FIELDS = ['_rev', '_deleted', '_meta', '_attachments'];
const SCALAR_TYPES = ['string', 'number', 'boolean', 'integer'];
const NARROW_COLUMN_COUNT = 2;

/**
 * Chooses the columns of the document grid: the primary key, one wide
 * column, up to two more scalar fields, the revision and the last write time.
 *
 * A filled RxJsonSchema lists its properties alphabetically, so the order a
 * developer wrote them in is gone by the time the database viewer sees the schema.
 * The columns are therefore picked by what they are worth reading:
 *
 * - The wide column goes to a string without a `maxLength`, because that is
 *   free text. Bounded strings are usually ids, dates or enums.
 * - The remaining slots prefer the fields the schema marks as required.
 */
export function pickGridColumns(
    jsonSchema: RxJsonSchema<any>,
    primaryPath: string
): GridColumn[] {
    const properties: any = jsonSchema.properties ?? {};
    const required: string[] = (jsonSchema.required as string[]) ?? [];
    const scalarFields = Object.keys(properties)
        .filter(name => name !== primaryPath && !INTERNAL_FIELDS.includes(name))
        .filter(name => SCALAR_TYPES.includes(properties[name].type));

    const stringFields = scalarFields.filter(name => properties[name].type === 'string');
    const wideField = stringFields.find(name => properties[name].maxLength === undefined)
        ?? stringFields
            .slice(0)
            .sort((a, b) => (properties[b].maxLength ?? 0) - (properties[a].maxLength ?? 0))[0]
        ?? scalarFields[0];

    const columns: GridColumn[] = [
        { path: primaryPath, label: primaryPath, width: '90px' },
        wideField
            ? { path: wideField, label: wideField, width: '1fr' }
            : { path: '_deleted', label: '_deleted', width: '1fr' }
    ];
    scalarFields
        .filter(name => name !== wideField)
        .sort((a, b) => {
            const rankDifference = Number(required.includes(b)) - Number(required.includes(a));
            return rankDifference === 0 ? a.localeCompare(b) : rankDifference;
        })
        .slice(0, NARROW_COLUMN_COUNT)
        .forEach(name => {
            columns.push({ path: name, label: name, width: '90px' });
        });
    columns.push({ path: '_rev', label: '_rev', width: '90px' });
    columns.push({ path: '_meta.lwt', label: 'updated', width: '100px' });
    return columns;
}

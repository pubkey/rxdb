import {
    toTypedRxJsonSchema,
    type ExtractDocumentTypeFromTypedRxJsonSchema,
    type RxJsonSchema,
    type WithDeleted
} from 'rxdb';

/**
 * This file is imported by the client and by the server
 * so that both sides agree on the document shape.
 */
export const todoSchemaLiteral = {
    title: 'todo',
    version: 0,
    /**
     * The key-compression plugin replaces the long property names
     * with short ones before the data is stored in IndexedDB.
     */
    keyCompression: true,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        title: {
            type: 'string'
        },
        done: {
            type: 'boolean'
        },
        createdAt: {
            type: 'number',
            minimum: 0,
            maximum: 100000000000000,
            multipleOf: 1
        },
        updatedAt: {
            type: 'number',
            minimum: 0,
            maximum: 100000000000000,
            multipleOf: 1
        }
    },
    required: ['id', 'title', 'done', 'createdAt', 'updatedAt'],
    indexes: ['createdAt'],
    /**
     * The title is encrypted at rest with the encryption-crypto-js plugin.
     * Encrypted fields cannot be indexed or queried by value.
     */
    encrypted: ['title']
} as const;

export const todoSchemaTyped = toTypedRxJsonSchema(todoSchemaLiteral);
export type TodoDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof todoSchemaTyped>;
export const todoSchema: RxJsonSchema<TodoDocType> = todoSchemaLiteral;

/**
 * The server assigns a strictly increasing sequence number
 * to every write. The client stores the last seen one as checkpoint
 * and asks for everything that came after it.
 */
export type TodoCheckpoint = {
    seq: number;
};

export type PullResponse = {
    documents: WithDeleted<TodoDocType>[];
    checkpoint: TodoCheckpoint;
};

export type PushRow = {
    assumedMasterState?: WithDeleted<TodoDocType>;
    newDocumentState: WithDeleted<TodoDocType>;
};

/**
 * Shape of the 'data' field of each server-sent event on the pull stream.
 */
export type PullStreamEvent = PullResponse;

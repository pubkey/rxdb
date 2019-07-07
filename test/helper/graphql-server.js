/**
 * spawns a graphql-server
 * that can be used in tests and examples
 * @link https://graphql.org/graphql-js/#writing-code
 */

const faker = require('faker');

// TODO replace these 2 with methods of async-test-util
const randomToken = require('random-token');

const {
    randomBoolean,
    randomNumber
} = require('async-test-util');

function humanWithTimestamp() {
    const now = Math.round(new Date().getTime() / 1000);
    return {
        id: randomToken(12),
        name: faker.name.firstName(),
        age: randomNumber(1, 100),
        updatedAt: randomNumber(now - 60 * 60 * 24 * 7, now),
        deleted: randomBoolean()
    };
}


let lastPort = 16121;

const {
    graphql,
    buildSchema
} = require('graphql');


/**
 * schema in graphql
 * matches ./schemas.js#humanWithTimestamp
 */
const schema = buildSchema(`
    type Query {
        feedForRxDBReplication(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Human!]!
    }
    type Human {
        id: ID!,
        name: String!,
        age: Int!,
        updatedAt: Int!,
        deleted: Boolean!
    }
    enum HumanOrderBy {
        updatedAt_ASC_primary_ASC
    }
`);


function sortByUpdatedAtAndPrimary(a, b) {
    if (a.updatedAt > b.updatedAt) return 1;
    if (a.updatedAt < b.updatedAt) return -1;

    if (a.updatedAt === b.updatedAt) {
        if (a.id > b.id) return 1;
        if (a.id < b.id) return -1;
        else return 0;
    }
}


async function spawn() {


    const documents = new Array(100).fill(0).map(() => humanWithTimestamp());

    // The root provides a resolver function for each API endpoint
    const root = {
        feedForRxDBReplication: (args, context, info) => {
            console.log('feed resolver:');
            console.dir(args);

            // sorted by updatedAt and primary
            const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary);

            // only return where updatedAt >= minUpdatedAt
            const filterForMinUpdatedAt = sortedDocuments.filter(doc => doc.updatedAt >= args.minUpdatedAt);

            // limit
            const limited = filterForMinUpdatedAt.slice(0, args.limit);


            console.dir(limited);
            return limited;
        }
    };

    const latestDocument = {
        id: '94nyn7sdnd1v',
        name: 'Marty',
        age: 60,
        updatedAt: 1561928001,
        deleted: true
    };

    const queryBuilder = doc => `{
        feedForRxDBReplication(lastId: "${doc.id}", minUpdatedAt: ${doc.updatedAt}, limit: 10) {
            id
            name
            age
            updatedAt
            deleted
        }
    }`;

    const query = queryBuilder(latestDocument);
    graphql(schema, query, root).then((response) => {
        console.dir(response);
        console.dir(response.data.feed[0]);
    });
}

spawn();
import express from 'express';
import { createServer } from 'http';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import {
    buildSchema,
    execute,
    subscribe
} from 'graphql';

const schema = buildSchema(`
type Query {
    info: Int
    feedForRxDBReplication(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Human!]!
}
type Mutation {
    setHuman(human: HumanInput): Human
}
input HumanInput {
    id: ID!,
    name: String!,
    color: String!,
    updatedAt: Int,
    deleted: Boolean!
}
type Human {
    id: ID!,
    name: String!,
    color: String!,
    updatedAt: Int!,
    deleted: Boolean!
}
type Subscription {
    humanChanged: Human
}
schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
}
`);

const PORT = 10103;
const app = express();

const pubsub = new PubSub();
const server = createServer(app);

const rootValue = {
    setHuman: args => {},
    humanChanged: pubsub.asyncIterator('humanChanged')
};

server.listen(PORT, () => {
    new SubscriptionServer({
        execute,
        subscribe,
        schema,
        rootValue
    }, {
            server: server,
            path: '/subscriptions',
        });
});


setInterval(() => {
    pubsub.publish(
        'humanChanged',
        {
            humanChanged: {
                id: 'foobar'
            }
        }
    );
    console.log('published humanChanged');
}, 1000);
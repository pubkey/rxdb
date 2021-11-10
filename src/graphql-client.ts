// SPDX-License-Identifier: ISC
// Copyright (c) 2016-2018, Simon Nord and other contributors
// https://github.com/nordsimon/graphql-client/blob/f8d1dcba8a65f290e35b71c883a18094594d6d5a/index.js

// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2021-present, Contributors to the rxdb project

export interface GraphQLError {
    message: string;
    locations: Array<{
        line: number;
        column: number;
    }>;
    path: string[];
}

export type GraphQLErrors = Array<GraphQLError>;

function highlightQuery(query: string, errors: GraphQLErrors) {
    const locations = errors
        .map((e) => {
            return e.locations;
        })
        .reduce((a, b) => {
            return a.concat(b);
        }, []);

    let queryHighlight = '';

    query.split('\n').forEach((row, index) => {
        const line = index + 1;
        const lineErrors = locations.filter((loc) => {
            return loc && loc.line === line;
        });

        queryHighlight += row + '\n';

        if (lineErrors.length) {
            const errorHighlight: string[] = [];

            lineErrors.forEach((lineError) => {
                for (let i = 0; i < 8; i++) {
                    errorHighlight[lineError.column + i] = '~';
                }
            });

            for (let i = 0; i < errorHighlight.length; i++) {
                queryHighlight += errorHighlight[i] || ' ';
            }
            queryHighlight += '\n';
        }
    });

    return queryHighlight;
}

export interface GraphQLClientParams {
    url: string;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
}

function GraphQLClient(params: GraphQLClientParams) {
    require('isomorphic-fetch');
    if (!params.url) throw new Error('Missing url parameter');

    const headers = new Headers(params.headers || {});
    headers.append('Content-Type', 'application/json');

    return {
        query: (
            query: string,
            variables?: Record<string, unknown>,
            onResponse?: (req: Request, res: Response) => void
        ) => {
            const req = new Request(params.url, {
                method: 'POST',
                body: JSON.stringify({
                    query: query,
                    variables: variables,
                }),
                headers: headers,
                credentials: params.credentials,
            });

            return fetch(req)
                .then((res) => {
                    onResponse && onResponse(req, res);

                    return res.json();
                })
                .then((body) => {
                    if (body.errors && body.errors.length) {
                        body.highlightQuery = highlightQuery(
                            query,
                            body.errors
                        );
                    }

                    return body;
                });
        },
    };
}

export default GraphQLClient;

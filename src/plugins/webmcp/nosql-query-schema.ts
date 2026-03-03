export const NOSQL_QUERY_JSON_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "NoSQL Query",
    "description": "Query selector with sort and limit options. See https://rxdb.info/rx-query.html",
    "type": "object",
    "additionalProperties": true,
    "required": ["selector"],
    "properties": {
        "selector": { "$ref": "#/$defs/expression" },
        "sort": { "$ref": "#/$defs/sort" },
        "limit": {
            "type": "integer",
            "minimum": 1,
            "examples": [10, 50, 100]
        },
        "skip": {
            "type": "integer",
            "minimum": 0,
            "examples": [10, 50]
        }
    },
    "examples": [
        {
            "selector": {
                "age": { "$gt": 18 },
                "status": "active"
            },
            "sort": [{ "createdAt": "desc" }],
            "limit": 10
        },
        {
            "selector": {
                "$or": [
                    { "company.name": { "$regex": "Inc", "$options": "i" } },
                    { "tags": { "$in": ["premium", "vip"] } }
                ],
                "address.country": "USA"
            },
            "limit": 50
        }
    ],
    default: {
        "selector": {},
        "sort": [],
        "limit": 50,
        "skip": 0
    },

    "$defs": {
        "sort": {
            "description": "Sort document (e.g. [{ createdAt: 'desc' }, { name: 'asc' }]).",
            "type": "array",
            "items": {
                "type": "object",
                "minProperties": 1,
                "additionalProperties": false,
                "patternProperties": {
                    "^(?!\\$).+$": {
                        "type": "string",
                        "enum": ["asc", "desc"]
                    }
                }
            },
            "examples": [
                [{ "createdAt": "desc" }],
                [{ "lastName": "asc" }, { "createdAt": "desc" }]
            ]
        },

        "expression": {
            "anyOf": [
                { "$ref": "#/$defs/logicalExpression" },
                { "$ref": "#/$defs/fieldExpression" }
            ]
        },

        "logicalExpression": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "$and": {
                    "type": "array",
                    "minItems": 1,
                    "items": { "$ref": "#/$defs/expression" },
                    "examples": [
                        [
                            { "status": "active" },
                            { "age": { "$gte": 21 } }
                        ]
                    ]
                },
                "$or": {
                    "type": "array",
                    "minItems": 1,
                    "items": { "$ref": "#/$defs/expression" },
                    "examples": [
                        [
                            { "role": "admin" },
                            { "role": "moderator" }
                        ]
                    ]
                },
                "$nor": {
                    "type": "array",
                    "minItems": 1,
                    "items": { "$ref": "#/$defs/expression" },
                    "examples": [
                        [
                            { "archived": true },
                            { "deleted": true }
                        ]
                    ]
                },
                "$not": {
                    "$ref": "#/$defs/expression",
                    "examples": [
                        { "age": { "$lt": 18 } },
                        { "name": { "$regex": "^test" } }
                    ]
                }
            },
            "anyOf": [
                { "required": ["$and"] },
                { "required": ["$or"] },
                { "required": ["$nor"] },
                { "required": ["$not"] }
            ],
            "examples": [
                { "$and": [{ "status": "active" }, { "age": { "$gte": 21 } }] },
                { "$or": [{ "tier": "pro" }, { "trial": true }] },
                { "$nor": [{ "deleted": true }, { "blocked": true }] },
                { "$not": { "age": { "$gte": 65 } } }
            ]
        },

        "fieldExpression": {
            "type": "object",
            "minProperties": 1,
            "additionalProperties": false,
            "patternProperties": {
                "^(?!\\$).+$": {
                    "anyOf": [
                        { "$ref": "#/$defs/literal" },
                        { "$ref": "#/$defs/fieldOperatorExpression" }
                    ]
                }
            },
            "examples": [
                { "status": "active" },
                { "age": { "$gte": 18 } },
                { "tags": { "$in": ["nosql", "database"] } }
            ]
        },

        "fieldOperatorExpression": {
            "type": "object",
            "minProperties": 1,
            "additionalProperties": false,
            "properties": {
                "$eq": {
                    "$ref": "#/$defs/literal",
                    "examples": ["active", 42, null]
                },
                "$ne": {
                    "$ref": "#/$defs/literal",
                    "examples": ["deleted", 0]
                },
                "$gt": {
                    "$ref": "#/$defs/literal",
                    "examples": [10, 100]
                },
                "$gte": {
                    "$ref": "#/$defs/literal",
                    "examples": [18, 0]
                },
                "$lt": {
                    "$ref": "#/$defs/literal",
                    "examples": [100, 5]
                },
                "$lte": {
                    "$ref": "#/$defs/literal",
                    "examples": [5, 99]
                },

                "$in": {
                    "type": "array",
                    "items": { "$ref": "#/$defs/literal" },
                    "examples": [
                        ["red", "green"],
                        [1, 2, 3]
                    ]
                },
                "$nin": {
                    "type": "array",
                    "items": { "$ref": "#/$defs/literal" },
                    "examples": [
                        ["test", "dummy"],
                        [0, -1]
                    ]
                },

                "$exists": {
                    "type": "boolean",
                    "examples": [true, false]
                },

                "$regex": {
                    "type": "string",
                    "examples": [
                        "^A",
                        ".*example.*",
                        "^[0-9]{4}$"
                    ]
                },

                "$options": {
                    "type": "string",
                    "examples": [
                        "i",
                        "g",
                        "m"
                    ]
                },

                "$type": {
                    "oneOf": [
                        { "type": "string" },
                        { "type": "integer" },
                        {
                            "type": "array",
                            "items": {
                                "oneOf": [{ "type": "string" }, { "type": "integer" }]
                            }
                        }
                    ],
                    "examples": [
                        "string",
                        "number",
                        2,
                        ["string", "null"]
                    ]
                },

                "$size": {
                    "type": "integer",
                    "minimum": 0,
                    "examples": [0, 3]
                },

                "$mod": {
                    "type": "array",
                    "minItems": 2,
                    "maxItems": 2,
                    "items": { "type": "integer" },
                    "examples": [
                        [4, 0],
                        [10, 5]
                    ]
                },

                "$elemMatch": {
                    "$ref": "#/$defs/expression",
                    "examples": [
                        { "qty": { "$gte": 10 } },
                        { "type": "book" }
                    ]
                }
            },

            "examples": [
                { "$eq": "active" },
                { "$ne": "deleted" },
                { "$gt": 10 },
                { "$gte": 18 },
                { "$lt": 100 },
                { "$lte": 5 },
                { "$in": ["red", "green"] },
                { "$nin": ["test"] },
                { "$exists": true },
                { "$regex": "^A" },
                { "$type": "string" },
                { "$size": 3 },
                { "$mod": [4, 0] },
                { "$elemMatch": { "qty": { "$gte": 10 } } }
            ]
        },

        "literal": {
            "oneOf": [
                { "type": "null" },
                { "type": "boolean" },
                { "type": "number" },
                { "type": "string" },
                { "type": "array" },
                { "type": "object" }
            ]
        }
    }
}
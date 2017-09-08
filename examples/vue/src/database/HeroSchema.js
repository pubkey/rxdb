const heroSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    type: 'object',
    properties: {
        name: {
            type: 'string',
            primary: true
        },
        color: {
            type: 'string'
        },
        maxHP: {
            type: 'number',
            min: 0,
            max: 1000
        },
        hp: {
            type: 'number',
            min: 0,
            max: 1000
        },
        team: {
            description: 'color of the team this hero belongs to',
            type: 'string'
        },
        skills: {
            type: 'array',
            maxItems: 5,
            uniqueItems: true,
            item: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    damage: {
                        type: 'number'
                    }
                }
            }
        }
    },
    required: ['color', 'maxHP']
};

export default heroSchema;

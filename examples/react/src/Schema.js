const heroSchema = {
    'title': 'hero schema',
    'description': 'describes a simple hero',
    'version': 0,
    'type': 'object',
    'properties': {
        'name': {
            'type': 'string',
            'primary': true
        },
        'color': {
            'type': 'string'
        }
    },
    'required': ['color']
};

export default heroSchema;

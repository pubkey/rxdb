import { ThemeRegistrationRaw } from 'shiki';

export const rxDbDraculaModifiedTheme: ThemeRegistrationRaw = {
    // RxDB uses a version of the Dracula theme from Prism that is no longer available.
    // We use a custom theme to match the style of the legacy Dracula theme with Shiki
    name: 'rxdb-dracula-modified-theme',
    type: 'dark',
    bg: '#282A36',
    fg: '#F8F8F2',
    settings: [
        {
            scope: [
                'source'
            ],
            settings: {
                'foreground': '#F8F8F2'
            }
        },
        {
            scope: [
                'comment',
                'punctuationDefinitionComment'
            ],
            settings: {
                'foreground': '#6272A4'
            }
        },
        {
            scope: [
                'constant',
                'constant.numeric',
                'constant.language',
                'support.constant'
            ],
            settings: {
                'foreground': '#BD93F9'
            }
        },
        {
            scope: [
                'entity.name.function',
                'support.function',
                'meta.function-call.generic',
                'variable.function'
            ],
            settings: {
                'foreground': '#50FA7B'
            }
        },
        {
            scope: [
                'string',
                'string.quoted',
                'punctuation.definition.string'
            ],
            settings: {
                'foreground': '#FF79C6'
            }
        },
        {
            scope: [
                'keyword.operator',
                'keyword.operator.assignment',
                'keyword.operator.comparison'
            ],
            settings: {
                'foreground': '#FF79C6'
            }
        },
        {
            scope: [
                'storage.type',
                'storage.modifier',
                'keyword.control.import',
                'keyword.control.export',
                'keyword.control.from',
                'keyword.control.default'
            ],
            settings: {
                'foreground': '#BD93F9',
                'fontStyle': 'italic'
            }
        },
        {
            scope: [
                'keyword.control',
                'keyword.control.conditional',
                'keyword.control.loop',
                'keyword.control.flow'
            ],
            settings: {
                'foreground': '#BD93F9',
                'fontStyle': 'italic'
            }
        },
        {
            scope: [
                'variable',
                'variable.other',
                'variable.parameter',
                'variable.other.readwrite',
                'meta.import variable',
                'meta.export variable'
            ],
            settings: {
                'foreground': '#F8F8F2',
                'fontStyle': ''
            }
        },
        {
            scope: [
                'variable.other.constant'
            ],
            settings: {
                'foreground': '#BD93F9'
            }
        },
        {
            scope: [
                'entity.name.tag',
                'support.class.component'
            ],
            settings: {
                'foreground': '#FF79C6'
            }
        },
        {
            scope: [
                'entity.other.attribute-name'
            ],
            settings: {
                'foreground': '#F1FA8C'
            }
        },
        {
            scope: [
                'punctuation',
                'meta.brace'
            ],
            settings: {
                'foreground': '#F8F8F2'
            }
        },
        {
            scope: [
                'markup.deleted',
                'diff.deleted'
            ],
            settings: {
                'foreground': '#FF5555'
            }
        },
        {
            scope: [
                'markup.inserted',
                'diff.inserted'
            ],
            settings: {
                'foreground': '#50FA7B'
            }
        },
        {
            scope: [
                'markup.changed',
                'diff.changed'
            ],
            settings: {
                'foreground': '#FFB86C'
            }
        },
        {
            scope: [
                'support.type.property-name',
                'entity.name.tag.css'
            ],
            settings: {
                'foreground': '#F8F8F2'
            }
        },
        {
            scope: [
                'meta.object-literal.key'
            ],
            settings: {
                'foreground': '#F8F8F2'
            }
        }
    ]
};

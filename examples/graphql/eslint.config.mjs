import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es6
            },
            ecmaVersion: 2022,
            sourceType: 'module'
        },
        rules: {
            // ... (I will keep the same rules but redundant to list them all again if I can use replace, but write_to_file is safer to ensure valid file)
            // Actually, I should use the previous content and just change the parts needed.
            // But write_to_file is easier than replace for the whole file if I have the content.
            // I'll copy the rules from step 473 and update ecmaVersion.
            'accessor-pairs': 'error',
            'array-bracket-newline': 'off',
            'array-bracket-spacing': [
                'error',
                'never'
            ],
            'array-callback-return': 'off',
            'array-element-newline': 'off',
            'arrow-body-style': 'off',
            'arrow-parens': 'off',
            'arrow-spacing': [
                'error',
                {
                    'after': true,
                    'before': true
                }
            ],
            'block-scoped-var': 'error',
            'block-spacing': 'error',
            'brace-style': [
                'error',
                '1tbs'
            ],
            'callback-return': 'error',
            'capitalized-comments': 'off',
            'class-methods-use-this': 'off',
            'comma-dangle': 'off',
            'comma-spacing': [
                'error',
                {
                    'after': true,
                    'before': false
                }
            ],
            'comma-style': [
                'error',
                'last'
            ],
            'complexity': 'off',
            'computed-property-spacing': [
                'error',
                'never'
            ],
            'consistent-return': 'off',
            'consistent-this': 'off',
            'curly': 'off',
            'default-case': 'off',
            'dot-location': [
                'error',
                'property'
            ],
            'dot-notation': 'off',
            'eol-last': 'off',
            'eqeqeq': 'off',
            'func-call-spacing': 'error',
            'func-name-matching': 'off',
            'func-names': 'off',
            'func-style': 'off',
            'function-paren-newline': 'off',
            'generator-star-spacing': 'error',
            'global-require': 'off',
            'guard-for-in': 'off',
            'handle-callback-err': 'error',
            'id-blacklist': 'error',
            'id-length': 'off',
            'id-match': 'error',
            'implicit-arrow-linebreak': 'off',
            'indent': [
                'error',
                4,
                {
                    'MemberExpression': 'off',
                    'SwitchCase': 1
                }
            ],
            'init-declarations': 'off',
            'jsx-quotes': 'error',
            'key-spacing': 'error',
            'keyword-spacing': 'off',
            'line-comment-position': 'off',
            'linebreak-style': [
                'error',
                'unix'
            ],
            'lines-around-comment': 'off',
            'lines-around-directive': 'error',
            'lines-between-class-members': 'off',
            'max-classes-per-file': 'off',
            'max-depth': 'error',
            'max-len': 'off',
            'max-lines': 'off',
            'max-lines-per-function': 'off',
            'max-nested-callbacks': 'error',
            'max-params': 'off',
            'max-statements': 'off',
            'max-statements-per-line': 'error',
            'multiline-comment-style': 'off',
            'multiline-ternary': [
                'error',
                'always-multiline'
            ],
            'new-parens': 'off',
            'newline-after-var': 'off',
            'newline-before-return': 'off',
            'newline-per-chained-call': 'off',
            'no-alert': 'error',
            'no-array-constructor': 'error',
            'no-await-in-loop': 'off',
            'no-bitwise': 'off',
            'no-buffer-constructor': 'off',
            'no-caller': 'error',
            'no-catch-shadow': 'error',
            'no-case-declarations': 'off',
            'no-confusing-arrow': 'off',
            'no-constant-condition': [
                'error',
                {
                    'checkLoops': false
                }
            ],
            'no-console': 'off',
            'no-continue': 'off',
            'no-div-regex': 'error',
            'no-duplicate-imports': 'off',
            'no-else-return': 'off',
            'no-empty': [
                'error',
                {
                    'allowEmptyCatch': true
                }
            ],
            'no-empty-function': 'off',
            'no-eq-null': 'error',
            'no-eval': 'error',
            'no-extend-native': 'error',
            'no-extra-bind': 'error',
            'no-extra-label': 'error',
            'no-extra-parens': 'off',
            'no-floating-decimal': 'error',
            'no-implicit-globals': 'error',
            'no-implied-eval': 'error',
            'no-inline-comments': 'off',
            'no-invalid-this': 'off',
            'no-iterator': 'error',
            'no-label-var': 'error',
            'no-labels': 'error',
            'no-lone-blocks': 'error',
            'no-lonely-if': 'off',
            'no-loop-func': 'off',
            'no-magic-numbers': 'off',
            'no-mixed-operators': 'off',
            'no-mixed-requires': 'error',
            'no-multi-assign': 'error',
            'no-multi-spaces': 'error',
            'no-multi-str': 'error',
            'no-multiple-empty-lines': 'off',
            'no-native-reassign': 'error',
            'no-negated-condition': 'off',
            'no-negated-in-lhs': 'error',
            'no-nested-ternary': 'error',
            'no-new': 'error',
            'no-new-func': 'error',
            'no-new-object': 'error',
            'no-new-require': 'error',
            'no-new-wrappers': 'error',
            'no-octal-escape': 'error',
            'no-param-reassign': 'off',
            'no-path-concat': 'error',
            'no-plusplus': 'off',
            'no-process-env': 'off',
            'no-process-exit': 'off',
            'no-proto': 'off',
            'no-prototype-builtins': 'off',
            'no-restricted-globals': 'error',
            'no-restricted-imports': 'error',
            'no-restricted-modules': 'error',
            'no-restricted-properties': 'error',
            'no-restricted-syntax': 'error',
            'no-return-assign': 'off',
            'no-return-await': 'off',
            'no-script-url': 'error',
            'no-self-compare': 'error',
            'no-sequences': 'error',
            'no-shadow': 'off',
            'no-shadow-restricted-names': 'error',
            'no-spaced-func': 'error',
            'no-sync': 'off',
            'no-tabs': 'error',
            'no-template-curly-in-string': 'error',
            'no-ternary': 'off',
            'no-throw-literal': 'error',
            'no-trailing-spaces': [
                'error',
                {
                    'ignoreComments': true,
                    'skipBlankLines': true
                }
            ],
            'no-undef-init': 'error',
            'no-undefined': 'off',
            'no-underscore-dangle': 'off',
            'no-unmodified-loop-condition': 'error',
            'no-unneeded-ternary': 'off',
            'no-unused-expressions': 'off',
            'no-use-before-define': 'off',
            'no-useless-call': 'error',
            'no-useless-computed-key': 'error',
            'no-useless-concat': 'off',
            'no-useless-constructor': 'error',
            'no-useless-return': 'off',
            'no-var': 'error',
            'no-void': 'error',
            'no-warning-comments': 'off',
            'no-whitespace-before-property': 'error',
            'no-with': 'error',
            'nonblock-statement-body-position': [
                'error',
                'any'
            ],
            'object-curly-newline': 'off',
            'object-curly-spacing': [
                'error',
                'always'
            ],
            'object-property-newline': 'error',
            'object-shorthand': 'off',
            'one-var': 'off',
            'one-var-declaration-per-line': [
                'error',
                'initializations'
            ],
            'operator-assignment': 'off',
            'operator-linebreak': [
                'error',
                'after'
            ],
            'padded-blocks': 'off',
            'padding-line-between-statements': 'error',
            'prefer-arrow-callback': 'off',
            'prefer-const': 'error',
            'prefer-destructuring': 'off',
            'prefer-numeric-literals': 'error',
            'prefer-object-spread': 'off',
            'prefer-promise-reject-errors': 'error',
            'prefer-reflect': 'off',
            'prefer-rest-params': 'off',
            'prefer-spread': 'off',
            'prefer-template': 'off',
            'quote-props': 'off',
            'quotes': [
                'error',
                'single'
            ],
            'radix': 'off',
            'require-atomic-updates': 'off',
            'require-await': 'off',
            'require-jsdoc': 'off',
            'rest-spread-spacing': [
                'error',
                'never'
            ],
            'semi': 'error',
            'semi-spacing': [
                'error',
                {
                    'after': true,
                    'before': false
                }
            ],
            'semi-style': [
                'error',
                'last'
            ],
            'sort-imports': 'off',
            'sort-keys': 'off',
            'sort-vars': 'off',
            'space-before-blocks': 'error',
            'space-before-function-paren': 'off',
            'space-in-parens': [
                'error',
                'never'
            ],
            'space-infix-ops': 'error',
            'space-unary-ops': 'error',
            'spaced-comment': 'off',
            'strict': 'error',
            'switch-colon-spacing': 'error',
            'symbol-description': 'error',
            'template-curly-spacing': [
                'error',
                'never'
            ],
            'template-tag-spacing': 'error',
            'unicode-bom': [
                'error',
                'never'
            ],
            'valid-jsdoc': 'off',
            'vars-on-top': 'error',
            'wrap-iife': 'error',
            'wrap-regex': 'off',
            'yield-star-spacing': 'error',
            'yoda': 'off'
        }
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                fixture: 'readonly',
                test: 'readonly'
            }
        }
    }
];

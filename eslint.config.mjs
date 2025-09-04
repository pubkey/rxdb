import { fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import _import from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import path from 'node:path';
import stylistic from '@stylistic/eslint-plugin';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    {
        ignores: [
            'test/playground/*',
            'test/tutorials',
            '**/test_tmp/',
            '**/tmp/',
            '**/dist/',
            '**/package.json',
            '**/plugins/',
            '.transpile_state.json',
            'examples/angular',
            'examples/electron',
            'examples/electron-remote',
            'examples/graphql',
            'examples/ionic2',
            'examples/flutter',
            'examples/node',
            'examples/react-native',
            'examples/vue',
            'examples/svelte',
            'examples/react/build',
            'examples/tauri',
            'examples/vite-vanilla-ts',
            '**/node_modules',
            '**/docs',
            'docs-src/static/files/logo/js.build.js',
            'docs-src/_book/',
            'docs-src/.docusaurus/',
            'docs-src/build/',
            'docs-src/docusaurus-lunr-search-main',
            'config/.mocharc.cjs',
            'config/karma.webpack.conf.cjs'
        ]
    },
    ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/eslint-recommended', 'plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/recommended-requiring-type-checking'),
    {
        plugins: {
            import: fixupPluginRules(_import),
            '@stylistic': stylistic,
            jsdoc,
            '@typescript-eslint': typescriptEslint
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            },
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                extraFileExtensions: ['.json'],
                project: './tsconfig.lint.json'
            }
        },
        rules: {
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/type-annotation-spacing': 'error',
            '@stylistic/indent': 'off',
            '@stylistic/member-delimiter-style': [
               'error',
               {
                   multiline: {
                       delimiter: 'semi',
                       requireLast: true,
                   },
                   singleline: {
                       delimiter: 'semi',
                       requireLast: true,
                   },
               },
            ],
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/dot-notation': 'off',
            '@typescript-eslint/explicit-member-accessibility': [
                'off',
                {
                    accessibility: 'explicit'
                }
            ],
            '@typescript-eslint/member-ordering': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-misused-new': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-shadow': [
                'error',
                {
                    hoist: 'all'
                }
            ],
            '@typescript-eslint/no-unused-expressions': 'error',
            '@typescript-eslint/prefer-function-type': 'error',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/unified-signatures': 'error',
            'brace-style': ['error', '1tbs'],
            'constructor-super': 'error',
            curly: 'off',
            'dot-notation': 'off',
            'eol-last': 'error',
            eqeqeq: ['error', 'smart'],
            'guard-for-in': 'error',
            'id-blacklist': 'off',
            'id-match': 'off',
            'jsdoc/no-types': 'off',
            'no-bitwise': 'off',
            'no-caller': 'error',
            'no-console': [
                'error',
                {
                    allow: ['log', 'warn', 'dir', 'timeLog', 'assert', 'clear', 'count', 'countReset', 'group', 'groupEnd', 'table', 'dirxml', 'error', 'groupCollapsed', 'Console', 'profile', 'profileEnd', 'timeStamp', 'context']
                }
            ],
            'no-debugger': 'error',
            'no-empty': 'off',
            'no-empty-function': 'off',
            'no-eval': 'error',
            'no-fallthrough': 'error',
            'no-new-wrappers': 'error',
            'no-restricted-imports': ['error', 'rxjs/Rx'],
            'no-shadow': 'error',
            'no-throw-literal': 'error',
            'no-trailing-spaces': 'error',
            'no-undef-init': 'error',
            'no-underscore-dangle': 'off',
            'no-unused-expressions': 'error',
            'no-unused-labels': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            radix: 'error',
            'spaced-comment': [
                'error',
                'always',
                {
                    markers: ['/']
                }
            ],
            'require-await': 'error',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/naming-convention': 'off',
            '@typescript-eslint/restrict-plus-operands': 'off',
            '@typescript-eslint/await-thenable': 'off',
            '@typescript-eslint/only-throw-error': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'no-prototype-builtins': 'error',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    ignoreClassWithStaticInitBlock: true,
                    argsIgnorePattern: '^_',
                    caughtErrors: 'none'
                }
            ],
            // https://typescript-eslint.io/rules/no-unused-vars/#how-to-use
            'no-unused-vars': 'off',
            '@typescript-eslint/triple-slash-reference': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            indent: 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            semi: 'error',
            'no-case-declarations': 'off',
            'no-self-assign': 'off',
            'no-constant-condition': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            'prefer-rest-params': 'off',
            'prefer-spread': 'off',
            '@typescript-eslint/prefer-as-const': 'off',
            '@typescript-eslint/prefer-regexp-exec': 'off',
            '@typescript-eslint/unbound-method': 'off',
            'import/no-deprecated': 'off',
            '@typescript-eslint/no-implied-eval': 'off',
            '@typescript-eslint/require-await': 'off'
        }
    },
    {
        files: ['./config/*.js'],
        rules: {
            'accessor-pairs': 'error',
            'array-bracket-newline': 'off',
            'array-bracket-spacing': ['error', 'never'],
            'array-callback-return': 'off',
            'array-element-newline': 'off',
            'arrow-body-style': 'off',
            'arrow-parens': 'off',
            'arrow-spacing': [
                'error',
                {
                    after: true,
                    before: true
                }
            ],
            'block-scoped-var': 'error',
            'block-spacing': 'error',
            'brace-style': ['error', '1tbs'],
            'callback-return': 'error',
            'capitalized-comments': 'off',
            'class-methods-use-this': 'off',
            'comma-dangle': 'off',
            'comma-spacing': [
                'error',
                {
                    after: true,
                    before: false
                }
            ],
            'comma-style': ['error', 'last'],
            complexity: 'off',
            'computed-property-spacing': ['error', 'never'],
            'consistent-return': 'off',
            'consistent-this': 'off',
            curly: 'off',
            'default-case': 'off',
            'dot-location': ['error', 'property'],
            'dot-notation': 'off',
            'eol-last': 'off',
            eqeqeq: 'off',
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
            indent: [
                'error',
                4,
                {
                    MemberExpression: 'off',
                    SwitchCase: 1
                }
            ],
            'indent-legacy': 'off',
            'init-declarations': 'off',
            'jsx-quotes': 'error',
            'key-spacing': 'error',
            'keyword-spacing': 'off',
            'line-comment-position': 'off',
            'linebreak-style': ['error', 'unix'],
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
            'multiline-ternary': ['error', 'always-multiline'],
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
                    checkLoops: false
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
                    allowEmptyCatch: true
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
            'no-prototype-builtins': 'error',
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
                    ignoreComments: true,
                    skipBlankLines: true
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
            'nonblock-statement-body-position': ['error', 'any'],
            'object-curly-newline': 'off',
            'object-curly-spacing': ['error', 'always'],
            'object-property-newline': 'error',
            'object-shorthand': 'off',
            'one-var': 'off',
            'one-var-declaration-per-line': ['error', 'initializations'],
            'operator-assignment': 'off',
            'operator-linebreak': ['error', 'after'],
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
            quotes: ['error', 'single'],
            radix: 'off',
            'require-atomic-updates': 'off',
            'require-await': 'off',
            'require-jsdoc': 'off',
            'rest-spread-spacing': ['error', 'never'],
            semi: 'error',
            'semi-spacing': [
                'error',
                {
                    after: true,
                    before: false
                }
            ],
            'semi-style': ['error', 'last'],
            'sort-imports': 'off',
            'sort-keys': 'off',
            'sort-vars': 'off',
            'space-before-blocks': 'error',
            'space-before-function-paren': 'off',
            'space-in-parens': ['error', 'never'],
            'space-infix-ops': 'error',
            'space-unary-ops': 'error',
            'spaced-comment': 'off',
            strict: 'error',
            'switch-colon-spacing': 'error',
            'symbol-description': 'error',
            'template-curly-spacing': ['error', 'never'],
            'template-tag-spacing': 'error',
            'unicode-bom': ['error', 'never'],
            'valid-jsdoc': 'off',
            'vars-on-top': 'error',
            'wrap-iife': 'error',
            'wrap-regex': 'off',
            'yield-star-spacing': 'error',
            yoda: 'off'
        }
    },
    {
        files: ['**/*.js'],
        rules: {
            'no-var': 'off',
            '@typescript-eslint/no-require-imports': 'off'
        }
    },
    {
        files: ['**/*.json'],
        rules: {
            '@stylistic/quotes': ['error', 'double'],
            '@stylistic/semi': 'off',
            'no-unused-expressions': 'off',
            semi: 'off',
            '@typescript-eslint/no-unused-expressions': 'off'
        }
    },
    {
        files: ['**/*.mjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off'
        }
    },
    {
        files: ['**/.eslintrc.json']
    },
    {
        files: ['docs-src/static/files/logo/js.js'],
        rules: {
            'no-undef': 'off',
            '@typescript-eslint/prefer-promise-reject-errors': 'off'
        }
    },
    {
        files: ['examples/react/test/e2e.test.js'],
        rules: {
            'no-undef': 'off'
        }
    },
    {
        files: ['**/*.test.ts', '**/*.d.ts', './test/**/*.ts'],
        rules: {
            '@typescript-eslint/prefer-promise-reject-errors': 'off'
        }
    }
];

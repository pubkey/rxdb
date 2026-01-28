---
title: Contribute
slug: contribution.html
description: Got a fix or fresh idea? Learn how to contribute to RxDB, run tests, and shape the future of this cutting-edge NoSQL database for JavaScript.
---



# Contribution

We are open to, and grateful for, any contributions made by the community.

# Developing

## Requirements

Before you can start developing, do the following:

1. Make sure you have installed nodejs with the version stated in the [.nvmrc](https://github.com/pubkey/rxdb/blob/master/.nvmrc)
2. Clone the repository `git clone https://github.com/pubkey/rxdb.git`
3. Install the dependencies `cd rxdb && npm install`
4. Make sure that the tests work for you. At first, try it out with `npm run test:node:memory` which tests the [memory storage](./rx-storage-memory.md) in node. In the [package.json](https://github.com/pubkey/rxdb/blob/master/package.json) you can find more scripts to run the tests with different storages.

## Adding tests

Before you start creating a bugfix or a feature, you should create a test to reproduce it. Tests are in the `test/unit`-folder.
If you want to reproduce a bug, you can modify the test in [this file](https://github.com/pubkey/rxdb/blob/master/test/unit/bug-report.test.ts).

## Making a PR

If you make a pull-request, ensure the following:

1. Every feature or bugfix must be committed together with a unit-test which ensures everything works as expected.
2. Do not commit build-files (anything in the `dist`-folder)
3. Before you add non-trivial changes, create an issue to discuss if this will be merged and you don't waste your time.
4. To run the unit and integration-tests, do `npm run test` and ensure everything works as expected

## Getting help

If you need help with your contribution, ask at [discord](https://rxdb.info/chat/).

## No-Go

When reporting a bug, you need to make a PR with a test case that runs in the CI and reproduces your problem.
Sending a link with a repo does not help the maintainer because installing random peoples projects is time consuming and dangerous.
Also the maintainer will never go on a bug hunt based on your plain description. Either you report the bug with a test case, or the maintainer will likely not help you. 

# Docs

The source of the documentation is at the `docs-src`-folder.
To read the docs locally, run `npm run docs:install && npm run docs:serve` and open `http://localhost:4000/`




# Thank you for contributing!

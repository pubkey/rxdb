# Contribution

We are open to, and grateful for, any contributions made by the community.

# Developing

## Requirements

Before you can start developing, do the following:

1. Make shoud you have install nodejs with version 7 or higher.
2. Clone the repository `git clone https://github.com/pubkey/rxdb.git`
3. Install the dependencies `cd rxdb && npm install`
4. Make sure that the tests work for you `npm run test`

## Flow

While developing you should run `npm run dev` and leave it open in the console. This will run the unit-tests on every file-change. If you have a slow device, you can also manually run `npm run test:node` everytime you want to check if the tests work.

## Adding tests

Before you start creating a bugfix or a feature, you should create a test to reprocue it. Tests are in the `test/unit`-folder. If you don't know where to put your test into, just put it anywhere The maintainer will later move it to the correct position.

## Making a PR

If you make a pull-request, ensure the following:

1. Every feature or bugfix must be commited together with a unit-test which ensures everything works as expected.
2. Do not commit build-files (anything in the `dist`-folder)
3. Before you add non-trivial changes, create an issue to discuss if this will be merged and you don't waste your time.
4. To run the unit and integration-tests, do `npm run test` and ensure everything works as expected

## Getting help

If you need help with your contribution, ask at [gitter](https://gitter.im/pubkey/rxdb).


# Docs

The source of the documentation is at the `docs-src`-folder.
To read the docs locallly, run `npm run docs docs:install && npm run docs:serve` and open [http://localhost:4000/](http://localhost:4000/)




# Thank you for contributing!

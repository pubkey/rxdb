# release-checklist
Things that have to be done before, while and after a release.

## pre-release

- [ ] Ensure that [the CI](https://github.com/pubkey/rxdb/actions) succeeds
- [ ] Ensure no [issues](https://github.com/pubkey/rxdb/issues) are open that should be solved before the release
- [ ] If a major release is done, ensure [this list](./before-next-major.md) is empty

## release

- [ ] Run the [release action](https://github.com/pubkey/rxdb/actions/workflows/release.yml) and wait until it is finished

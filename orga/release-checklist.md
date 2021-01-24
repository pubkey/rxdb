# release-checklist
Things that have to be done before, while and after a release.

## pre-release

- [ ] Ensure that [the CI](https://github.com/pubkey/rxdb/actions) succeeds
- [ ] Ensure no [issues](https://github.com/pubkey/rxdb/issues) are open that should be solved before the release
- [ ] If a major release is done, ensure [this list](./before-next-major.md) is empty

## release

- [ ] Run the [build action](https://github.com/pubkey/rxdb/actions?query=workflow%3ABuild) and wait until it is finished
- [ ] run `git pull`
- [ ] Update the `version`-field in the package.json
- [ ] Update the version and the date in the CHANGELOG.md
- [ ] Run `git add .` and `git commit -m '${newVersion}'` and `git push origin master` to push the new release to the github-repo
- [ ] Run `npm publish` to push the new release to npm
- [ ] Create a new tag at the [github-repo](https://github.com/pubkey/rxdb/releases/new)


## post-release

- [ ] Tweet about the new release at [twitter](https://twitter.com/compose/tweet)
- [ ] Message about the new release at [gitter](https://gitter.im/pubkey/rxdb)

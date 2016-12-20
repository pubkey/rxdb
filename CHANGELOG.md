## 1.5.5 (December 20, 2016)

Features:

  - refactor socket to save db-io
  - wrap BroadcastChannel-API
  - added [leader-election](./docs/LeaderElection.md)
  - sync() will only start wenn db is leader

Bugfixes:

  - cleanup all databases after tests
  - remove broken builds from dist-folder

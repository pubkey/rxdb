#!/bin/bash
set -e

echo "# installing FoundationDB client:"
wget -O foundationdb-client.deb https://github.com/apple/foundationdb/releases/download/7.3.59/foundationdb-clients_7.3.59-1_amd64.deb
sudo dpkg -i foundationdb-client.deb
rm foundationdb-client.deb


echo "# installing FoundationDB server:"
wget -O foundationdb-server.deb https://github.com/apple/foundationdb/releases/download/7.3.59/foundationdb-server_7.3.59-1_amd64.deb
sudo dpkg -i foundationdb-server.deb
rm foundationdb-server.deb


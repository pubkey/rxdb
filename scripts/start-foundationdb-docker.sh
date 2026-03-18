#!/bin/bash
set -e

FDB_VERSION="7.3.59"
CONTAINER_NAME="rxdb-foundationdb"
FDB_CLUSTER_FILE="/etc/foundationdb/fdb.cluster"
TIMEOUT_SECONDS=30

echo "# Starting FoundationDB Docker container..."

# Remove any existing container
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

# Start the FoundationDB server container with host networking
docker run -d \
    --name "$CONTAINER_NAME" \
    --network host \
    -e FDB_NETWORKING_MODE=host \
    "foundationdb/foundationdb:${FDB_VERSION}"

echo "# Waiting for container to initialize..."
sleep 2

# Create the cluster file directory on the host
sudo mkdir -p /etc/foundationdb

# Copy the cluster file from the container to the host.
# The container generates a cluster file on startup at /var/fdb/fdb.cluster.
# With --network host and FDB_NETWORKING_MODE=host, the cluster file
# contains an IP address reachable from the host.
docker cp "$CONTAINER_NAME:/var/fdb/fdb.cluster" /tmp/fdb.cluster
sudo cp /tmp/fdb.cluster "$FDB_CLUSTER_FILE"
rm /tmp/fdb.cluster
echo "# Cluster file contents:"
cat "$FDB_CLUSTER_FILE"

# Wait for the FoundationDB server to be reachable
echo "# Waiting for FoundationDB to be reachable..."
SECONDS_WAITED=0
while [ "$SECONDS_WAITED" -lt "$TIMEOUT_SECONDS" ]; do
    if fdbcli --exec "status minimal" --timeout 5 2>/dev/null; then
        echo "# FoundationDB server is reachable."
        break
    fi
    sleep 1
    SECONDS_WAITED=$((SECONDS_WAITED + 1))
done

if [ "$SECONDS_WAITED" -ge "$TIMEOUT_SECONDS" ]; then
    echo "# WARNING: Timed out waiting for FoundationDB to be reachable."
fi

# Configure the database for single-machine operation with in-memory storage engine
echo "# Configuring database..."
fdbcli --exec "configure new single memory" --timeout "$TIMEOUT_SECONDS" || true

# Wait for the database to become available after configuration
echo "# Waiting for database to become available..."
SECONDS_WAITED=0
while [ "$SECONDS_WAITED" -lt "$TIMEOUT_SECONDS" ]; do
    STATUS=$(fdbcli --exec "status minimal" --timeout 5 2>/dev/null || echo "")
    if echo "$STATUS" | grep -q "The database is available"; then
        echo "# FoundationDB is ready!"
        exit 0
    fi
    sleep 1
    SECONDS_WAITED=$((SECONDS_WAITED + 1))
done

echo "# ERROR: FoundationDB did not become available within ${TIMEOUT_SECONDS} seconds."
echo "# Container logs:"
docker logs "$CONTAINER_NAME" 2>&1 | tail -50
exit 1

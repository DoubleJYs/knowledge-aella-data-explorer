#!/bin/bash
# Keep the local Wrangler D1 database populated from backend/data/db.sqlite.
#
# This is intentionally a file-level sync because the project already uses a
# SQLite baseline database locally. The app should not depend on re-importing
# seed data on every start.

set -e

echo "Setting up local D1 database for development..."
echo ""

SOURCE_DB="data/db.sqlite"

if [ ! -f "$SOURCE_DB" ]; then
    echo "Error: source database not found at $SOURCE_DB"
    exit 1
fi

# Find the D1 database path (Wrangler stores it in .wrangler/state/v3/d1/miniflare-D1DatabaseObject/)
D1_DIR=".wrangler/state/v3/d1/miniflare-D1DatabaseObject"

if [ ! -d "$D1_DIR" ]; then
    echo "Warning: D1 directory not found at $D1_DIR"
    echo "Start the backend once with 'task backend:dev' so Wrangler creates local D1 state, then rerun this script."
    exit 0
fi

# Find the actual .sqlite file in the directory
D1_DB_FILE=$(find "$D1_DIR" -name "*.sqlite" -type f | head -n 1)

if [ -z "$D1_DB_FILE" ]; then
    echo "Warning: No .sqlite file found in $D1_DIR"
    echo "Start the backend once with 'task backend:dev' so Wrangler creates local D1 state, then rerun this script."
    exit 0
fi

echo "Found local D1 database at: $D1_DB_FILE"
echo ""

if [ -f "$D1_DB_FILE" ]; then
    SOURCE_SIZE=$(wc -c < "$SOURCE_DB" | tr -d ' ')
    TARGET_SIZE=$(wc -c < "$D1_DB_FILE" | tr -d ' ')
    if [ "$SOURCE_SIZE" = "$TARGET_SIZE" ] && [ "${FORCE_D1_SYNC:-0}" != "1" ]; then
        echo "Local D1 database already matches $SOURCE_DB; leaving it in place."
        echo "Set FORCE_D1_SYNC=1 to overwrite it from $SOURCE_DB."
        exit 0
    fi

    BACKUP_FILE="${D1_DB_FILE}.backup.$(date +%Y%m%d%H%M%S)"
    echo "Creating backup: $BACKUP_FILE"
    cp "$D1_DB_FILE" "$BACKUP_FILE"
fi

echo "Copying $SOURCE_DB to replace local D1 database..."
echo ""

# Copy our database
cp "$SOURCE_DB" "$D1_DB_FILE"

echo ""
echo "✓ Database copied successfully!"
echo ""
echo "You can now run: task backend:dev"
echo ""
echo "Note: The local D1 database is stored at: $D1_DB_FILE"
echo "If you need to reset it, delete that file and run 'task backend:dev' once to recreate local D1 state."

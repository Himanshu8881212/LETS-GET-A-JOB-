#!/bin/bash
set -e

echo "========================================"
echo "Database Initialization - LETS-GET-A-JOB"
echo "========================================"

DB_PATH="/app/data/app.db"
SCHEMA_PATH="/app/lib/db/schema.sql"
MIGRATIONS_DIR="/app/lib/db/migrations"

# Ensure data directory exists
mkdir -p /app/data

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Database does not exist. Creating new database..."

    # Create empty database
    sqlite3 "$DB_PATH" "SELECT 1;" > /dev/null 2>&1

    echo "✓ Database file created at $DB_PATH"
else
    echo "✓ Database already exists at $DB_PATH"
fi

# Enable foreign keys and WAL mode
echo "Configuring database settings..."
sqlite3 "$DB_PATH" <<SQL
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
SQL

echo "✓ Database configuration applied"

# Check if schema is initialized (check for users table)
TABLES_EXIST=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null || echo "0")

if [ "$TABLES_EXIST" = "0" ]; then
    echo "Initializing database schema..."

    if [ -f "$SCHEMA_PATH" ]; then
        sqlite3 "$DB_PATH" < "$SCHEMA_PATH"
        echo "✓ Base schema applied successfully"
    else
        echo "ERROR: Schema file not found at $SCHEMA_PATH"
        exit 1
    fi
else
    echo "✓ Base schema already exists"
fi

# Create migrations tracking table if it doesn't exist
echo "Setting up migration tracking..."
sqlite3 "$DB_PATH" <<SQL
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
SQL

echo "✓ Migration tracking table ready"

# Get list of applied migrations
APPLIED_MIGRATIONS=$(sqlite3 "$DB_PATH" "SELECT filename FROM schema_migrations;" 2>/dev/null || echo "")

echo "Checking for pending migrations..."

# Define migration order (critical for dependencies)
MIGRATION_ORDER=(
    "add-version-control.sql"
    "add-resume-version-to-jobs.sql"
    "add-cover-letter-version-control.sql"
    "add-cover-letter-version-to-jobs.sql"
    "add-foreign-key-constraints.sql"
    "fix-status-constraint.sql"
    "add-ats-evaluations-table.sql"
    "add-custom-name-to-ats-evaluations.sql"
)

MIGRATIONS_APPLIED=0
MIGRATIONS_SKIPPED=0
MIGRATIONS_FAILED=0

# Apply migrations in order
for migration_file in "${MIGRATION_ORDER[@]}"; do
    migration_path="$MIGRATIONS_DIR/$migration_file"

    # Check if already applied
    if echo "$APPLIED_MIGRATIONS" | grep -q "^${migration_file}$"; then
        echo "  ⊙ $migration_file (already applied)"
        MIGRATIONS_SKIPPED=$((MIGRATIONS_SKIPPED + 1))
        continue
    fi

    # Check if file exists
    if [ ! -f "$migration_path" ]; then
        echo "  ✗ $migration_file (file not found)"
        MIGRATIONS_FAILED=$((MIGRATIONS_FAILED + 1))
        continue
    fi

    echo "  → Applying $migration_file..."

    # Apply migration in a transaction
    if sqlite3 "$DB_PATH" <<SQL
BEGIN TRANSACTION;

$(cat "$migration_path")

INSERT OR IGNORE INTO schema_migrations (filename) VALUES ('$migration_file');

COMMIT;
SQL
    then
        echo "  ✓ $migration_file (applied successfully)"
        MIGRATIONS_APPLIED=$((MIGRATIONS_APPLIED + 1))
    else
        echo "  ✗ $migration_file (failed - but continuing)"
        MIGRATIONS_FAILED=$((MIGRATIONS_FAILED + 1))

        # Try to record it anyway to avoid re-attempting
        sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO schema_migrations (filename) VALUES ('$migration_file');" 2>/dev/null || true
    fi
done

echo ""
echo "Migration Summary:"
echo "  Applied: $MIGRATIONS_APPLIED"
echo "  Skipped: $MIGRATIONS_SKIPPED"
echo "  Failed:  $MIGRATIONS_FAILED"

# Verify critical tables exist
echo ""
echo "Verifying critical tables..."

REQUIRED_TABLES=(
    "users"
    "job_applications"
    "resume_versions"
    "cover_letter_versions"
    "ats_evaluations"
    "activity_logs"
    "job_status_history"
    "schema_migrations"
)

MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    TABLE_EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='$table';" 2>/dev/null || echo "0")

    if [ "$TABLE_EXISTS" = "1" ]; then
        echo "  ✓ $table"
    else
        echo "  ✗ $table (MISSING)"
        MISSING_TABLES+=("$table")
    fi
done

if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
    echo ""
    echo "ERROR: ${#MISSING_TABLES[@]} critical table(s) are missing!"
    echo "Missing tables: ${MISSING_TABLES[*]}"
    exit 1
fi

# Show database statistics
echo ""
echo "Database Statistics:"
sqlite3 "$DB_PATH" <<SQL
.mode column
SELECT
    name as 'Table Name',
    (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as 'Indexes',
    (SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND tbl_name=m.name) as 'Triggers'
FROM sqlite_master m
WHERE type='table'
AND name NOT LIKE 'sqlite_%'
ORDER BY name;
SQL

echo ""
echo "========================================"
echo "✓ Database initialization complete!"
echo "========================================"
echo ""
echo "Database: $DB_PATH"
echo "Total Tables: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")"
echo "Total Migrations: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM schema_migrations;")"
echo ""

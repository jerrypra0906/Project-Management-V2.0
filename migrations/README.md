# Database Migrations

This directory contains SQL migration files for the Project Management database schema.

## Migration Files

- `001_initial_schema.sql` - Creates all base tables (departments, users, initiatives, changeRequests, tags, etc.)
- `002_add_notifications_table.sql` - Adds the notifications table for in-app notifications

## Running Migrations

The migrations are automatically applied when the application starts via the `initializeSchema()` function in `backend/store.js`. However, you can also run them manually:

### Using psql (PostgreSQL command line)

```bash
# Connect to your database
psql -h localhost -p 5434 -U postgres -d project_management_v2

# Run a migration
\i migrations/001_initial_schema.sql
\i migrations/002_add_notifications_table.sql
```

### Using Docker

```bash
# Copy migration file to container
docker cp migrations/001_initial_schema.sql project_management_db:/tmp/

# Execute migration
docker exec -i project_management_db psql -U postgres -d project_management_v2 < migrations/001_initial_schema.sql
```

## Migration Order

Migrations should be run in numerical order:
1. `001_initial_schema.sql` - Must be run first
2. `002_add_notifications_table.sql` - Can be run after initial schema

## Notes

- All migrations use `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` to be idempotent
- Migrations can be safely run multiple times without causing errors
- The application's `initializeSchema()` function in `backend/store.js` handles schema initialization automatically


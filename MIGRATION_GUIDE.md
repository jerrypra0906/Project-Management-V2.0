# Migration Guide - Running Migrations Across Environments

This guide explains how to run database migrations (SQL and Node.js scripts) across different environments.

## 📋 Table of Contents

1. [Should Migration Files Be Pushed to GitHub?](#should-migration-files-be-pushed-to-github)
2. [Types of Migrations](#types-of-migrations)
3. [Environment-Specific Instructions](#environment-specific-instructions)
   - [Local Development](#local-development)
   - [Staging Environment](#staging-environment)
   - [Production Environment](#production-environment)

---

## ✅ Should Migration Files Be Pushed to GitHub?

**YES, absolutely!** Migration files should always be committed and pushed to GitHub because:

1. **Version Control**: Migrations are part of your codebase and need to be tracked
2. **Reproducibility**: All environments need the same migration scripts
3. **Collaboration**: Team members need access to run migrations
4. **Deployment**: Production/staging servers pull code from GitHub and need migrations
5. **Documentation**: Migration history shows how the database schema evolved

**Always commit migration files:**
- ✅ SQL migration files (`migrations/*.sql`)
- ✅ Node.js migration scripts (`backend/migrate*.js`)
- ✅ Enum definitions (`backend/enums/`)
- ❌ `.env` files (never commit, use `.env.example` instead)

---

## 🔧 Types of Migrations

### 1. SQL Migrations (Schema Changes)
Located in `migrations/` folder:
- `001_initial_schema.sql` - Initial database schema
- `002_add_notifications_table.sql` - Notifications table
- `003_update_users_and_initiatives.sql` - User and initiative updates

### 2. Node.js Data Migration Scripts
Located in `backend/` folder:
- `backend/migrate.js` - Initializes database schema
- `backend/migrate_user_roles.js` - Normalizes user roles (ITPIC → IT, etc.)
- `backend/migrate_task_enums.js` - Normalizes task status and milestone values

---

## 🌍 Environment-Specific Instructions

### Local Development

#### Prerequisites
- Docker and Docker Compose installed
- Project cloned locally
- `.env` file configured (copy from `.env.example`)

#### Step-by-Step: Running SQL Migrations

```bash
# 1. Navigate to project directory
cd Project-Management-V2.0

# 2. Start Docker containers (if not already running)
docker-compose up -d

# 3. Wait for database to be ready (about 10-15 seconds)
docker-compose ps

# 4. Copy SQL migration file to container
docker cp migrations/001_initial_schema.sql project_management_db:/001_initial_schema.sql

# 5. Run the migration inside the database container
docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -f /001_initial_schema.sql

# 6. Repeat for other migrations (002, 003, etc.)
docker cp migrations/002_add_notifications_table.sql project_management_db:/002_add_notifications_table.sql
docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -f /002_add_notifications_table.sql
```

#### Step-by-Step: Running Node.js Migration Scripts

```bash
# 1. Ensure containers are running
docker-compose ps

# 2. Run migration script inside backend container
docker exec -it project_management_backend node backend/migrate_task_enums.js

# Other available migrations:
docker exec -it project_management_backend node backend/migrate_user_roles.js
docker exec -it project_management_backend node backend/migrate.js
```

#### Alternative: Using npm scripts (if added to package.json)

```bash
# Run via npm script
docker exec -it project_management_backend npm run db:migrate-task-enums

# Or run locally (if Node.js is installed and database is accessible)
npm run db:migrate-task-enums
```

---

### Staging Environment

#### Prerequisites
- SSH access to staging server
- Docker and Docker Compose installed on staging server
- Code deployed/updated on staging server
- `.env` file configured for staging

#### Step-by-Step: Running Migrations on Staging

```bash
# 1. SSH into staging server
ssh user@staging-server-ip

# 2. Navigate to project directory
cd /opt/Project-Management-V2.0  # or your staging path

# 3. Pull latest code (to get new migration files)
git pull origin main  # or your staging branch

# 4. Verify containers are running
docker-compose ps

# 5. Run SQL migrations (if needed)
docker cp migrations/001_initial_schema.sql project_management_db:/001_initial_schema.sql
docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -f /001_initial_schema.sql

# 6. Run Node.js migration scripts
docker exec -it project_management_backend node backend/migrate_task_enums.js

# 7. Verify migration completed successfully
# Check the console output for success messages
```

#### Important Notes for Staging:
- ⚠️ **Backup First**: Always backup the staging database before running migrations
- ✅ **Test First**: Test migrations on local/staging before production
- 📝 **Log Output**: Save migration output for troubleshooting
- 🔄 **Rollback Plan**: Have a rollback plan ready

---

### Production Environment

Based on your deployment setup (`172.28.80.51` for backend):

#### Prerequisites
- SSH access to production server (`172.28.80.51`)
- Production database credentials
- Backup of production database (CRITICAL!)

#### Step-by-Step: Running Migrations on Production

```bash
# 1. SSH into production backend server
ssh user@172.28.80.51

# 2. Navigate to project directory
cd /opt/Project-Management-V2.0

# 3. Pull latest code from GitHub
git pull origin main  # Ensure migration files are present

# 4. BACKUP DATABASE FIRST (CRITICAL!)
docker exec project_management_db \
  pg_dump -U postgres project_management_v2 > backup_$(date +%Y%m%d_%H%M%S).sql

# 5. Verify containers are running
docker-compose ps

# 6. Run SQL migrations (if needed)
docker cp migrations/001_initial_schema.sql project_management_db:/001_initial_schema.sql
docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -f /001_initial_schema.sql

# 7. Run Node.js migration scripts
docker exec -it project_management_backend node backend/migrate_task_enums.js

# 8. Verify application is working
curl http://localhost:3000/health
# Should return: {"ok":true}

# 9. Monitor application logs
docker-compose logs -f backend
```

#### Production Best Practices:

1. **Maintenance Window**: Schedule migrations during low-traffic periods
2. **Database Backup**: Always backup before running migrations
3. **Test on Staging**: Always test migrations on staging first
4. **Monitor Closely**: Watch application logs and metrics after migration
5. **Rollback Ready**: Have rollback scripts ready if needed
6. **Document Changes**: Document what was migrated and when

---

## 🔍 Verification Steps

After running any migration:

```bash
# 1. Check migration output for errors
# (Review console output from migration script)

# 2. Verify database connection
docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -c "\dt"

# 3. Check application health
curl http://localhost:3000/health

# 4. Test affected functionality
# (Manually test features that use migrated data)
```

---

## 📝 Migration Script Checklist

Before committing and deploying a new migration:

- [ ] Migration script is tested locally
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Migration file is committed to GitHub
- [ ] Documentation updated (this guide, README, etc.)
- [ ] Rollback plan documented (if needed)
- [ ] Team notified about migration
- [ ] Staging environment tested
- [ ] Backup procedure verified

---

## 🆘 Troubleshooting

### Migration Fails

1. **Check Error Message**: Review the error output carefully
2. **Verify Database Connection**: Ensure database is running and accessible
3. **Check Permissions**: Verify database user has required permissions
4. **Review Logs**: Check container logs: `docker-compose logs backend`
5. **Restore Backup**: If critical, restore from backup

### Container Not Found

```bash
# List running containers
docker ps

# Check container name (might be different)
docker-compose ps

# Use correct container name in commands
```

### Permission Denied

```bash
# Check if you're in docker group
groups

# Or use sudo (if allowed)
sudo docker exec ...
```

---

## 📚 Additional Resources

- [DEPLOYMENT-ALIYUN.md](./DEPLOYMENT-ALIYUN.md) - Production deployment guide
- [README.md](./README.md) - General project documentation
- [migrations/README.md](./migrations/README.md) - SQL migrations documentation

---

## 💡 Tips

1. **Idempotent Migrations**: Write migrations to be safe when run multiple times
2. **Small Changes**: Keep migrations focused and small
3. **Version Control**: Always commit migration files
4. **Documentation**: Document what each migration does
5. **Testing**: Test migrations on staging before production
6. **Backups**: Never skip backups, especially in production

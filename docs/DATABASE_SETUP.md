# Database Configuration Guide

This guide explains how to configure PostgreSQL for the Kite AlgoTrading application with separate local and external database configurations.

## Overview

The application supports two database configuration modes:

1. **Local Development**: Direct PostgreSQL connection using individual settings
2. **Production/External**: Using `DATABASE_URL` for managed databases (Render.com, Heroku, etc.)

## Configuration Files

### Environment Files

- `.env.local` - Local development configuration
- `.env.example` - General configuration template
- `.env.render.example` - Render.com specific configuration

### Database Settings

The application automatically chooses the configuration based on environment variables:

- If `DATABASE_URL` is set → Uses external database
- If `DATABASE_URL` is not set → Uses local database settings

## Local Development Setup

### 1. Install PostgreSQL

**Windows:**
```powershell
# Download and install from https://www.postgresql.org/download/windows/
# Or using chocolatey:
choco install postgresql
```

### 2. Create Database User and Database

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database (if using default 'postgres' database, skip this)
CREATE DATABASE kite_algotrading;

-- Set password for postgres user
ALTER USER postgres PASSWORD 'admin@123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kite_algotrading TO postgres;
```

### 3. Configure Environment

Copy and customize the local environment file:

```bash
cp .env.local .env
```

Edit `.env` file:
```bash
# Local PostgreSQL Database Configuration
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=admin@123
DB_HOST=localhost
DB_PORT=5432

# Make sure DATABASE_URL is commented out for local development
# DATABASE_URL=
```

### 4. Test Connection

```bash
python test_db_connection.py
```

### 5. Set Up Database

```bash
python setup_database.py
```

## Production/External Database Setup

### Render.com Configuration

1. **Create PostgreSQL Service** in Render.com dashboard
2. **Get Database URL** from the service details
3. **Set Environment Variables** in your web service:

```bash
DATABASE_URL=postgresql://username:password@hostname:port/database_name
DEBUG=False
ALLOWED_HOSTS=.onrender.com,yourdomain.onrender.com
```

### Manual External Database

If using a custom PostgreSQL server:

```bash
# Set the DATABASE_URL environment variable
DATABASE_URL=postgresql://user:password@host:port/database

# Or use individual settings
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=your_host.com
DB_PORT=5432
```

## Database Operations

### Run Migrations

```bash
# Navigate to backend directory
cd backend

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### Create Superuser

```bash
python manage.py createsuperuser
```

### Reset Database (Development Only)

```bash
# Delete migration files (keep __init__.py)
rm trading/migrations/0*.py

# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS kite_algotrading;"
psql -U postgres -c "CREATE DATABASE kite_algotrading;"

# Create fresh migrations
python manage.py makemigrations
python manage.py migrate
```

## Troubleshooting

### Connection Issues

1. **Check PostgreSQL Service**:
   ```bash
   # Windows
   Get-Service postgresql*
   
   # Start if not running
   Start-Service postgresql-x64-13  # or your version
   ```

2. **Check Credentials**:
   ```bash
   psql -U postgres -d postgres -h localhost -p 5432
   ```

3. **Reset Password**:
   ```sql
   ALTER USER postgres PASSWORD 'admin@123';
   ```

### Migration Issues

1. **Clear Migration History**:
   ```bash
   python manage.py migrate --fake-initial
   ```

2. **Reset Migrations**:
   ```bash
   python manage.py migrate trading zero
   python manage.py migrate
   ```

### Permission Issues

1. **Grant Database Permissions**:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE kite_algotrading TO postgres;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
   ```

## Environment Variables Reference

| Variable | Description | Local Default | Production |
|----------|-------------|---------------|------------|
| `DATABASE_URL` | Complete database URL | Not set | Required |
| `DB_NAME` | Database name | `postgres` | - |
| `DB_USER` | Database user | `postgres` | - |
| `DB_PASSWORD` | Database password | `admin@123` | - |
| `DB_HOST` | Database host | `localhost` | - |
| `DB_PORT` | Database port | `5432` | - |

## Security Notes

- Never commit `.env` files with real credentials
- Use strong passwords in production
- Consider using connection pooling for high-traffic applications
- Enable SSL for external database connections

## Database Schema

The application includes these main models:

- `User` - Extended user model for authentication
- `Trade` - Trading records and transactions
- `GlobalParameters` - Application configuration
- `UserROI` - User return on investment tracking
- `Screener` - Stock screening functionality

All models are defined in `backend/trading/models/` directory.

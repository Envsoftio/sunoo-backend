# Docker Setup for Sunoo Backend

This guide explains how to use Docker for the database while keeping your current development setup.

## 🐳 Docker Services

The Docker setup includes:
- **PostgreSQL 15** - Main database
- **pgAdmin 4** - Database administration interface
- **Redis 7** - Caching and rate limiting

## 🚀 Quick Start

### 1. Setup Docker Environment
```bash
# Run the setup script (creates .env.docker and starts services)
npm run docker:setup
```

### 2. Configure Environment
```bash
# Update the Docker environment file
cp env.docker.example .env.docker
# Edit .env.docker with your configuration
```

### 3. Run Migrations
```bash
# Run database migrations
npm run docker:migrate

# Run backup data migration
npm run docker:migrate-backup
```

### 4. Start Your Application
```bash
# Use Docker environment
cp .env.docker .env
npm run start:dev
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run docker:setup` | Initial setup (create .env.docker, start services) |
| `npm run docker:start` | Start Docker services |
| `npm run docker:stop` | Stop Docker services |
| `npm run docker:restart` | Restart Docker services |
| `npm run docker:status` | Show service status |
| `npm run docker:logs` | Show logs (all services) |
| `npm run docker:logs postgres` | Show logs for specific service |
| `npm run docker:reset-db` | Reset database (removes all data) |
| `npm run docker:migrate` | Run database migrations |
| `npm run docker:migrate-backup` | Run backup data migration |

## 🔧 Manual Docker Commands

If you prefer to use Docker directly:

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Reset database
docker-compose -f docker-compose.dev.yml down
docker volume rm sunoo-backend_postgres_dev_data
docker-compose -f docker-compose.dev.yml up -d
```

## 🌐 Access Points

- **Application**: http://localhost:3005
- **pgAdmin**: http://localhost:5050
  - Email: admin@sunoo.com
  - Password: admin123
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🔄 Switching Between Environments

### Use Docker Database
```bash
# Copy Docker environment
cp .env.docker .env
npm run start:dev
```

### Use Your Current Database
```bash
# Copy your current environment
cp .env.local .env  # or whatever your current env file is
npm run start:dev
```

## 📁 File Structure

```
├── docker-compose.yml          # Production Docker setup
├── docker-compose.dev.yml      # Development Docker setup
├── Dockerfile                  # Backend application Docker image
├── env.docker.example         # Docker environment template
├── init-scripts/              # Database initialization scripts
│   └── 01-init-database.sql
└── scripts/
    └── docker-setup.sh        # Docker management script
```

## 🗄️ Database Management

### Connect to Database
```bash
# Using psql
docker exec -it sunoo-postgres-dev psql -U postgres -d sunoo_backend

# Using pgAdmin
# Open http://localhost:5050 and connect to:
# Host: postgres
# Port: 5432
# Database: sunoo_backend
# Username: postgres
# Password: password
```

### Backup Database
```bash
# Create backup
docker exec sunoo-postgres-dev pg_dump -U postgres sunoo_backend > backup.sql

# Restore backup
docker exec -i sunoo-postgres-dev psql -U postgres sunoo_backend < backup.sql
```

## 🔧 Troubleshooting

### Services Won't Start
```bash
# Check Docker status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker exec sunoo-postgres-dev pg_isready -U postgres

# Check database exists
docker exec sunoo-postgres-dev psql -U postgres -l
```

### Reset Everything
```bash
# Stop and remove all containers and volumes
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f

# Start fresh
npm run docker:setup
```

## 🚀 Production Deployment

For production, use the main `docker-compose.yml`:

```bash
# Production deployment
docker-compose up -d

# With custom environment file
docker-compose --env-file .env.production up -d
```

## 📝 Notes

- The Docker setup uses persistent volumes, so your data will survive container restarts
- The development setup includes pgAdmin for easy database management
- You can run both Docker and your current database simultaneously on different ports
- All Docker services are on the `sunoo-dev-network` network for isolation

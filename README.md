# Sunoo Backend

A NestJS backend application with TypeORM, PostgreSQL, OpenAPI, and JWT authentication.

## Features

- 🚀 **NestJS** - Modern Node.js framework
- 🗄️ **TypeORM** - Type-safe ORM for PostgreSQL
- 🐘 **PostgreSQL** - Robust relational database
- 📚 **OpenAPI/Swagger** - Interactive API documentation
- 🔐 **JWT Authentication** - Secure token-based auth
- ✅ **Validation** - Request validation with class-validator
- 🛡️ **Security** - Helmet, CORS, and other security middleware
- 🐳 **Docker** - Containerized PostgreSQL and pgAdmin

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (or use Docker)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Start PostgreSQL (using Docker):

   ```bash
   docker-compose up -d postgres
   ```

5. Run the application:

   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

### API Documentation

Once the application is running, visit:

- **API Documentation**: http://localhost:3005/api
- **Health Check**: http://localhost:3005/health

### Database Management

- **pgAdmin**: http://localhost:5050 (admin@sunoo.com / admin)
- **PostgreSQL**: localhost:5432

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── guards/          # JWT guards
│   ├── strategies/      # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/               # Users module
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── entities/            # TypeORM entities
│   ├── base.entity.ts
│   └── user.entity.ts
├── dto/                 # Data Transfer Objects
│   ├── auth.dto.ts
│   └── user.dto.ts
├── config/              # Configuration files
│   ├── app.config.ts
│   └── database.config.ts
├── app.controller.ts
├── app.service.ts
├── app.module.ts
└── main.ts
```

## API Endpoints

### Authentication

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get current user profile

### Users

- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=sunoo_backend

# Application
PORT=3005
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Development

### Available Scripts

- `npm run start:dev` - Start in development mode
- `npm run build` - Build the application
- `npm run start:prod` - Start in production mode
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Database Migrations

TypeORM is configured with `synchronize: true` in development mode, which automatically creates/updates database schema. For production, use migrations:

```bash
# Generate migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run
```

## Deployment

This project supports automated deployment to VPS using GitHub Actions with self-hosted runners.

### Deployment Architecture

- **Production**: `https://api.sunoo.app` (Port 3005)
- **Staging**: `https://apidev.sunoo.app` (Port 3006)
- **Self-hosted runners**: Custom VPS runners for CI/CD
- **Process management**: PM2 for production process management
- **Database**: PostgreSQL with automated migrations

### Prerequisites for VPS Deployment

1. **VPS Setup**:

   ```bash
   # Run the VPS setup script
   chmod +x scripts/setup-vps.sh
   ./scripts/setup-vps.sh
   ```

2. **Required Software**:
   - Node.js 20+
   - PM2 (installed globally)
   - PostgreSQL client
   - Git

3. **User Configuration**:
   - `deploy` user with sudo privileges
   - GitHub Actions runners configured
   - SSH access configured

### GitHub Actions Workflows

#### Production Deployment

- **Trigger**: Manual dispatch or push to `main` branch
- **Runner**: `self-hosted-prod`
- **Environment**: Production
- **URL**: `https://api.sunoo.app`

#### Staging Deployment

- **Trigger**: Manual dispatch or push to `develop` branch
- **Runner**: `self-hosted-staging`
- **Environment**: Staging
- **URL**: `https://apidev.sunoo.app`

### Environment Variables

All environment variables are managed through GitHub Secrets:

#### Production Secrets (PROD\_\*)

- `PROD_DB_HOST`, `PROD_DB_PORT`, `PROD_DB_USERNAME`, `PROD_DB_PASSWORD`, `PROD_DB_NAME`
- `PROD_REDIS_HOST`, `PROD_REDIS_PORT`, `PROD_REDIS_PASSWORD`
- `PROD_JWT_SECRET`, `PROD_JWT_EXPIRES_IN`
- `PROD_EMAIL_HOST`, `PROD_EMAIL_PORT`, `PROD_EMAIL_USER`, `PROD_EMAIL_PASS`
- `PROD_EMAIL_FROM`, `PROD_EMAIL_BASE_URL`, `PROD_EMAIL_APP_URL`
- `PROD_CORS_ORIGIN`, `PROD_RATE_LIMIT_TTL`, `PROD_RATE_LIMIT_LIMIT`
- `PROD_SWAGGER_TITLE`, `PROD_SWAGGER_DESCRIPTION`, `PROD_SWAGGER_VERSION`
- `PROD_AWS_ACCESS_KEY_ID`, `PROD_AWS_SECRET_ACCESS_KEY`, `PROD_AWS_REGION`
- `PROD_AWS_S3_BUCKET`, `PROD_AWS_S3_HLS_URL`
- `PROD_RAZORPAY_KEY_ID`, `PROD_RAZORPAY_SECRET`

#### Staging Secrets (STAGING\_\*)

- Similar structure with `STAGING_` prefix
- Different values for staging environment

### Deployment Process

1. **Code Push**: Push to `main` (production) or `develop` (staging)
2. **GitHub Actions**: Workflow triggers on self-hosted runner
3. **Dependency Check**: Verifies Node.js, PM2, NestJS CLI
4. **Build**: Compiles TypeScript and installs dependencies
5. **Database Migration**: Runs TypeORM migrations
6. **Deploy**: Copies files to deployment directory
7. **Service Management**: Stops old service, starts new one
8. **Health Check**: Verifies application is running

### Manual Deployment Commands

```bash
# Build the application
npm run build

# Run database migrations
npm run migration:run

# Start with PM2
pm2 start ecosystem.config.js --env production

# Check status
pm2 status
pm2 logs sunoo-backend-prod
```

### Monitoring and Logs

- **PM2 Dashboard**: `pm2 monit`
- **Application Logs**: `/opt/sunoo-backend/logs/` (production)
- **Staging Logs**: `/opt/sunoo-backend-staging/logs/` (staging)
- **Health Endpoints**:
  - Production: `https://api.sunoo.app/health`
  - Staging: `https://apidev.sunoo.app/health`

### Troubleshooting

#### Common Issues

1. **Permission Denied**:

   ```bash
   sudo chown -R vishnu:vishnu /opt/sunoo-backend*
   sudo chmod -R 755 /opt/sunoo-backend*
   ```

2. **Service Not Starting**:

   ```bash
   pm2 logs sunoo-backend-prod
   pm2 restart sunoo-backend-prod
   ```

3. **Database Connection Issues**:
   - Check environment variables
   - Verify database server is running
   - Check network connectivity

4. **GitHub Runner Issues**:
   ```bash
   # Reset runners
   chmod +x scripts/reset-github-runners.sh
   ./scripts/reset-github-runners.sh
   ```

### Data Migration

For migrating data from backups to production:

```bash
# Run data migration script
chmod +x scripts/migrate-data-remote.sh
./scripts/migrate-data-remote.sh
```

## Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Helmet for security headers
- CORS configuration
- Input validation and sanitization
- Soft delete for data retention
- Environment variables secured via GitHub Secrets
- No sensitive data stored on VPS

## License

This project is licensed under the MIT License.

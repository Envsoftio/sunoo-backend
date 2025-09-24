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

## Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Helmet for security headers
- CORS configuration
- Input validation and sanitization
- Soft delete for data retention

## License

This project is licensed under the MIT License.

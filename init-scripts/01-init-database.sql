-- Initialize Sunoo database
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (though it's already created by POSTGRES_DB)
-- CREATE DATABASE IF NOT EXISTS sunoo_backend;

-- Create extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create a user for the application (optional)
-- CREATE USER sunoo_user WITH PASSWORD 'sunoo_password';
-- GRANT ALL PRIVILEGES ON DATABASE sunoo_backend TO sunoo_user;

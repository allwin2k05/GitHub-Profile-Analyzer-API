# GitHub Profile Analyzer API

A production-ready Node.js backend service that analyzes GitHub user profiles using the GitHub REST API, generates developer insights, and persists the results in a MySQL database for fast querying and analytics.

---

## Overview

GitHub Profile Analyzer is a RESTful API built with **Node.js**, **Express.js**, **MySQL**, and the **GitHub Public API**.

The service allows users to:

- Synchronize GitHub profiles into a local database
- Generate repository-based developer insights
- Store profile analytics for future access
- Search developers by primary programming language
- Retrieve top influencers based on GitHub stars
- Generate ecosystem-level analytics
- Avoid unnecessary GitHub API calls using change detection

The application follows a layered architecture with clear separation between:

- Controllers
- Services
- Repositories
- Middleware
- Utilities
- Database Layer

---

# Features

## Core Features

### GitHub Profile Synchronization

Fetches public GitHub profile information and repository metadata.

Example:

```http
POST /api/users/sync/octocat
```

Collected profile data includes:

- GitHub ID
- Username
- Name
- Company
- Blog
- Location
- Public Repository Count
- Followers
- Following

---

### Insight Generation

The system analyzes repositories and generates:

| Insight          | Description                          |
| ---------------- | ------------------------------------ |
| Total Stars      | Sum of stars across all repositories |
| Total Forks      | Sum of forks across all repositories |
| Top Language     | Most frequently used language        |
| Repository Count | Public repository count              |
| Followers        | Social influence metric              |

Example:

```json
{
  "totalStars": 1540,
  "totalForks": 231,
  "topLanguage": "TypeScript"
}
```

---

### Smart Sync Optimization

Before processing repositories, the application compares:

```javascript
stored.updated_at === github.updated_at;
```

If no changes are detected:

```json
{
  "status": "UNCHANGED",
  "message": "GitHub profile unchanged"
}
```

This reduces:

- GitHub API consumption
- Response time
- Rate-limit exposure

---

### Local Database Access

Fetch previously synchronized profiles without contacting GitHub.

```http
GET /api/users/local/:username
```

---

### Analytics Dashboard Endpoint

Provides system-wide analytics.

```http
GET /api/users/analytics
```

Returns:

- Total synced users
- Average repositories
- Ecosystem impact score
- Top influencer

---

### Top Influencers Ranking

```http
GET /api/users/top?limit=10
```

Ranks users by:

```sql
total_stars DESC
```

---

### Language Based Search

```http
GET /api/users/search?language=TypeScript
```

Find developers whose primary language matches the requested ecosystem.

---

### Health Monitoring

```http
GET /health
```

Returns:

- Uptime
- Memory usage
- Node version
- Database status
- Timestamp

---

# Architecture

```text
Client
  |
  v
Routes
  |
  v
Controllers
  |
  v
Services
  |
  v
Repositories
  |
  v
MySQL Database
```

### Layer Responsibilities

#### Routes

Responsible for:

- URL mapping
- Validation middleware
- Controller delegation

Files:

```text
src/routes/
├── userRoutes.js
└── healthRoutes.js
```

---

#### Controllers

Handle HTTP requests and responses.

Files:

```text
src/controllers/
├── userController.js
└── healthController.js
```

---

#### Services

Contain business logic.

Files:

```text
src/services/
├── githubService.js
├── insightService.js
├── syncService.js
└── userService.js
```

Responsibilities:

- GitHub communication
- Insight generation
- Synchronization workflow
- Analytics processing

---

#### Repository Layer

Handles database operations.

```text
src/repositories/
└── userRepository.js
```

---

#### Middleware

```text
src/middleware/
├── errorMiddleware.js
└── validateRequest.js
```

Provides:

- Global error handling
- Request validation

---

#### Utilities

```text
src/utils/
├── AppError.js
├── asyncHandler.js
├── githubErrorHandler.js
└── validateUser.js
```

---

# Project Structure

```text
github-profile-analyzer/
│
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── githubClient.js
│   │
│   ├── controllers/
│   │   ├── healthController.js
│   │   └── userController.js
│   │
│   ├── db/
│   │   ├── connection.js
│   │   └── connectWithRetry.js
│   │
│   ├── middleware/
│   │   ├── errorMiddleware.js
│   │   └── validateRequest.js
│   │
│   ├── repositories/
│   │   └── userRepository.js
│   │
│   ├── routes/
│   │   ├── healthRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── services/
│   │   ├── githubService.js
│   │   ├── insightService.js
│   │   ├── syncService.js
│   │   └── userService.js
│   │
│   ├── tests/
│   │   └── user.test.js
│   │
│   ├── utils/
│   │   ├── AppError.js
│   │   ├── asyncHandler.js
│   │   ├── githubErrorHandler.js
│   │   └── validateUser.js
│   │
│   └── app.js
│
├── docker-compose.yml
├── dockerfile
├── init.sql
├── package.json
└── README.md
```

---

# Technology Stack

## Backend

- Node.js
- Express.js

## Database

- MySQL 8

## Validation

- Zod

## HTTP Client

- Axios
- Axios Retry

## Security

- Helmet
- Express Rate Limit

## Logging

- Morgan

## Testing

- Jest
- Supertest

## Containerization

- Docker
- Docker Compose

---

# Security Features

### Helmet

Adds security headers:

```javascript
app.use(helmet());
```

---

### Rate Limiting

```javascript
max: 100 requests
window: 15 minutes
```

Protects API from abuse.

---

### Input Validation

Implemented using Zod.

Example:

```javascript
usernameSchema;
```

Validates:

- Length
- Format
- Consecutive hyphens
- Illegal characters

---

### Request Size Limits

```javascript
10kb
```

Protection against payload abuse.

---

### Environment Validation

All environment variables are validated at startup.

Application fails fast if required variables are missing.

---

# Database Schema

## Table: github_users

```sql
CREATE TABLE github_users (
    github_id BIGINT PRIMARY KEY,
    login VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    company VARCHAR(255),
    blog VARCHAR(500),
    location VARCHAR(255),

    public_repos INT,
    followers INT,
    following INT,

    total_stars INT,
    total_forks INT,
    top_language VARCHAR(100),

    created_at DATETIME,
    updated_at DATETIME,
    synced_at TIMESTAMP
);
```

---

## Indexes

```sql
idx_login
idx_language
idx_stars
idx_synced_at
```

Optimized for:

- User lookups
- Language search
- Rankings
- Recent synchronization queries

---

# API Documentation

## Postman Collection

The project includes a comprehensive Postman collection covering:

- Health checks
- Profile synchronization
- Validation testing
- Analytics endpoints
- Search functionality
- Error handling scenarios

### Import Collection

1. Open Postman
2. Click Import
3. Select:

```text
postman/GitHub-Profile-Analyzer.postman_collection.json
```

### Environment Variables

```json
{
  "base_url": "http://localhost:5000"
}
```

For deployed environments:

```json
{
    "base_url": "https://github-profile-analyzer-production.up.railway.app"
}
```

## Health Check

### Request

```http
GET /health
```

### Response

```json
{
  "success": true,
  "database": "connected"
}
```

---

## Sync GitHub Profile

### Request

```http
POST /api/users/sync/octocat
```

### Response

```json
{
  "success": true,
  "status": "UPDATED"
}
```

---

## Fetch All Profiles

### Request

```http
GET /api/users
```

---

## Fetch Single Stored Profile

### Request

```http
GET /api/users/local/octocat
```

---

## Analytics Summary

### Request

```http
GET /api/users/analytics
```

---

## Top Influencers

### Request

```http
GET /api/users/top?limit=5
```

---

## Search By Language

### Request

```http
GET /api/users/search?language=TypeScript
```

---

# Environment Variables

Create a `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=githubdb

GITHUB_TOKEN=your_github_token
```

---

# Local Development Setup

## Clone Repository

```bash
git clone <repository-url>
cd github-profile-analyzer
```

## Install Dependencies

```bash
npm install
```

## Configure Environment

```bash
cp .env.example .env
```

Update values.

## Start MySQL

```bash
mysql -u root -p
```

Create database:

```sql
CREATE DATABASE githubdb;
```

Run schema:

```bash
mysql -u root -p githubdb < init.sql
```

## Start Application

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

---

# Docker Deployment

## Run Entire Stack

```bash
docker compose up --build
```

Services:

| Service | Port |
| ------- | ---- |
| API     | 5000 |
| MySQL   | 3306 |

---

## Stop Containers

```bash
docker compose down
```

---

# Testing

Frameworks:

- Jest
- Supertest

Run:

```bash
npm test
```

---

# Validation Test Coverage

The project has been successfully tested against:

## Profile Synchronization

✓ Standard user synchronization

✓ High-volume organization accounts

✓ Enterprise repositories

✓ Repeat sync cache detection

---

## Input Validation

✓ Invalid username

✓ Consecutive hyphens

✓ Length violations

✓ Illegal characters

✓ Empty language query

✓ Invalid limits

---

## Database Access

✓ Fetch all users

✓ Fetch local user

✓ Missing user handling

---

## Analytics

✓ Analytics summary

✓ Top influencers

✓ Custom limit values

✓ Language ecosystem filtering

---

## Health Monitoring

✓ Health endpoint

✓ Database connectivity

✓ Runtime metadata

---

# Error Handling

Centralized error architecture.

Examples:

## GitHub User Not Found

```json
{
  "success": false,
  "message": "GitHub user not found"
}
```

---

## Validation Error

```json
{
  "success": false,
  "message": "Invalid GitHub username format"
}
```

---

## GitHub Rate Limit

```json
{
  "success": false,
  "message": "GitHub API rate limit exceeded"
}
```

---

# Performance Optimizations

### Database Indexing

Optimized search and ranking queries.

### Connection Pooling

```javascript
connectionLimit: 10;
```

### Retry Strategy

GitHub API requests automatically retry transient failures.

### Change Detection

Avoids unnecessary synchronization operations.

---

# Future Improvements

Potential enhancements:

- Redis caching layer
- GitHub GraphQL API integration
- Historical profile tracking
- Scheduled background synchronization
- Pagination support
- OpenAPI / Swagger documentation
- Authentication & RBAC
- Prometheus metrics
- CI/CD pipeline
- GitHub Actions deployment

---

# Assignment Requirements Mapping

| Requirement              | Status    |
| ------------------------ | --------- |
| Node.js                  | Completed |
| Express.js               | Completed |
| MySQL                    | Completed |
| GitHub API Integration   | Completed |
| Store Insights           | Completed |
| Persist Data             | Completed |
| Fetch All Profiles API   | Completed |
| Fetch Single Profile API | Completed |
| Docker Support           | Completed |
| Validation Layer         | Completed |
| Error Handling           | Completed |
| Automated Testing        | Completed |
| Production Hardening     | Completed |

---

# Author

**Yash Chincholi**

Backend Developer

Node.js • Express.js • MySQL • REST APIs

---

Built as part of the GitHub Profile Analyzer Backend Engineering Assignment.

# Backend Setup Guide

## Prerequisites
- Node.js installed
- MongoDB Atlas account (or local MongoDB)

## Setup Steps

### 1. Create .env file
Copy `.env.example` to `.env` and update with your MongoDB connection string:

```bash
cp .env.example .env
```

Then edit `.env` and add:
- `MONGO_URI`: Your MongoDB connection string
- `JWT_SECRET`: A random secret string (minimum 32 characters)
- `ADMIN_EMAIL`: Email for admin user (optional, defaults to admin@hrms.com)
- `ADMIN_PASSWORD`: Password for admin user (optional, defaults to admin123)

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Admin User
```bash
npm run init-admin
```

This will create an admin user with:
- Email: admin@hrms.com (or what you set in .env)
- Password: admin123 (or what you set in .env)
- Role: admin

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

- `POST /api/auth/login` - Login (accepts email/username and password)
- `POST /api/auth/register` - Register new user (admin/hr only)
- `GET /api/auth/me` - Get current user (requires JWT token)

## MongoDB Connection String Format

For MongoDB Atlas:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hr-management?retryWrites=true&w=majority
```

For Local MongoDB:
```
mongodb://localhost:27017/hr-management
```


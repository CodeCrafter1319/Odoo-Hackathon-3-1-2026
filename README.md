# HR Management Backend

Backend server for HR Management System built with Node.js, Express, and MongoDB.

## Quick Start

### 1. Setup Environment

**Option A: Use PowerShell script (Windows)**
```powershell
.\createEnv.ps1
```

**Option B: Manual setup**
1. Copy `.env.example` to `.env`
2. Edit `.env` and add your MongoDB connection string and JWT secret

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Admin User
```bash
npm run init-admin
```

This creates an admin user with:
- Email: `admin@hrms.com` (or what you set in .env)
- Password: `admin123` (or what you set in .env)

### 4. Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

## Environment Variables

Create a `.env` file with:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/hr-management
JWT_SECRET=your-secret-key-min-32-characters
ADMIN_EMAIL=admin@hrms.com
ADMIN_PASSWORD=admin123
CHATGPT_API_URL=https://chatgpt.com/gg/v/6958ab8e49e081a1bfcb896afc1d7697?token=ZXwT5hWNUEQEtEjU6L1EEQ
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (accepts `email`/`username` and `password`)
- `POST /api/auth/register` - Register new user (admin/hr only, requires JWT)
- `GET /api/auth/me` - Get current user (requires JWT)

### Login Request
```json
{
  "email": "admin@hrms.com",
  "password": "admin123"
}
```
OR
```json
{
  "username": "admin@hrms.com",
  "password": "admin123"
}
```

### Login Response
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "username": "Admin User",
    "email": "admin@hrms.com",
    "role": "admin",
    "id": "user-id"
  }
}
```

## User Roles

- `admin` - Full access, can register users
- `hr` - Can register users, manage employees
- `employee` - Basic access

## MongoDB Setup

### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Format: `mongodb+srv://username:password@cluster.mongodb.net/hr-management`

### Local MongoDB
```env
MONGO_URI=mongodb://localhost:27017/hr-management
```

## Troubleshooting

### "MongoDB Connection Error"
- Check your `.env` file has correct `MONGO_URI`
- Verify MongoDB is running (if local)
- Check network connection (if Atlas)

### "No token provided"
- Make sure to include `Authorization: Bearer <token>` header
- Token expires after 1 day

### "User not found"
- Run `npm run init-admin` to create admin user
- Check email/username is correct

# How to Get Admin Credentials from Database

## Option 1: Check Your .env File

If you have a `.env` file in `client/server/`, check these values:

```env
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password
```

## Option 2: Query Database Directly

### Using the Script I Created

1. **First, set up your .env file with MongoDB connection:**
   ```powershell
   cd client/server
   .\createEnv.ps1
   ```
   Enter your MongoDB connection string when prompted.

2. **Then list all users:**
   ```bash
   npm run list-users
   ```
   This will show all users in the database, including admin credentials.

### Using MongoDB Compass or MongoDB Shell

If you have MongoDB Compass or mongo shell access:

1. Connect to your MongoDB database
2. Navigate to the `users` collection
3. Look for documents where `role: "admin"`
4. The `email` field is the login username/email
5. Password is hashed, but if it was created with the init script, check:
   - Default: `admin123`
   - Or check `ADMIN_PASSWORD` in your `.env` file

## Option 3: Check Your Other PC

Since you mentioned the database is on another PC:

1. **On the other PC**, check:
   - The `.env` file in the backend folder
   - Look for `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   - Or run `npm run list-users` on that PC

2. **Common Default Credentials:**
   - Email: `admin@hrms.com`
   - Password: `admin123`

## Option 4: Create New Admin User

If you can't find the existing admin:

1. Set up `.env` file with your MongoDB connection string
2. Run:
   ```bash
   npm run init-admin
   ```
3. This will either:
   - Show existing admin email if one exists
   - Create new admin with default credentials

## Quick Check Commands

```bash
# Check if .env exists and has MongoDB URI
cd client/server
cat .env  # or type .env on Windows

# List all users in database
npm run list-users

# Check existing admin or create new one
npm run init-admin
```

## Default Credentials (If Not Changed)

Based on the code files:
- **Email/Username**: `admin@hrms.com`
- **Password**: `admin123`

These are the defaults unless changed in `.env` file.


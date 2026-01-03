# PowerShell Setup Script for Windows

Write-Host "🚀 Setting up HR Management Backend..." -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created. Please edit it with your MongoDB URI and JWT_SECRET" -ForegroundColor Green
    } else {
        Write-Host "❌ .env.example not found. Creating basic .env file..." -ForegroundColor Red
        @"
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/hr-management?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters-$(Get-Random)
ADMIN_EMAIL=admin@hrms.com
ADMIN_PASSWORD=admin123
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "✅ Basic .env file created. Please update MONGO_URI with your MongoDB connection string" -ForegroundColor Green
    }
} else {
    Write-Host "ℹ️  .env file already exists" -ForegroundColor Cyan
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file and add your MongoDB connection string" -ForegroundColor White
Write-Host "2. Run 'npm run init-admin' to create admin user" -ForegroundColor White
Write-Host "3. Run 'npm run dev' to start the server" -ForegroundColor White
Write-Host ""


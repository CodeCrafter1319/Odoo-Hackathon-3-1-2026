# Script to create .env file with MongoDB URI

Write-Host "🔧 Setting up .env file for HR Management Backend" -ForegroundColor Green
Write-Host ""

$mongoUri = Read-Host "Enter your MongoDB connection string (or press Enter to use placeholder)"
if ([string]::IsNullOrWhiteSpace($mongoUri)) {
    $mongoUri = "mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/hr-management?retryWrites=true&w=majority"
    Write-Host "⚠️  Using placeholder. Please update .env file with your actual MongoDB URI" -ForegroundColor Yellow
}

$jwtSecret = Read-Host "Enter JWT Secret (or press Enter to generate random)"
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    Write-Host "✅ Generated random JWT secret" -ForegroundColor Green
}

$adminEmail = Read-Host "Enter admin email (or press Enter for default: admin@hrms.com)"
if ([string]::IsNullOrWhiteSpace($adminEmail)) {
    $adminEmail = "admin@hrms.com"
}

$adminPassword = Read-Host "Enter admin password (or press Enter for default: admin123)"
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    $adminPassword = "admin123"
}

$chatgptUrl = Read-Host "Enter ChatGPT API URL (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($chatgptUrl)) {
    $chatgptUrl = "https://chatgpt.com/gg/v/6958ab8e49e081a1bfcb896afc1d7697?token=ZXwT5hWNUEQEtEjU6L1EEQ"
}

$envContent = @"
MONGO_URI=$mongoUri
JWT_SECRET=$jwtSecret
ADMIN_EMAIL=$adminEmail
ADMIN_PASSWORD=$adminPassword
CHATGPT_API_URL=$chatgptUrl
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify .env file has correct MongoDB URI" -ForegroundColor White
Write-Host "2. Run: npm run init-admin" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host ""


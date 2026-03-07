# Arena360 - Run full stack with one command
# Usage: .\start-system.ps1
#        .\start-system.ps1 -SkipDocker   # Skip Docker (use existing Postgres)
#        .\start-system.ps1 -SingleWindow # Run API + frontend in same window (concurrently)

param(
    [switch]$SkipDocker,
    [switch]$SingleWindow
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

Write-Host "===============================================" -ForegroundColor Magenta
Write-Host "   Arena360 - Full stack startup" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

# 1. Optional: Start Docker (Postgres, MinIO)
if (-not $SkipDocker) {
    Write-Host "[1/4] Starting Docker (Postgres, MinIO)..." -ForegroundColor Cyan
    if (Test-Path "$Root\docker-compose.yml") {
        docker-compose -f "$Root\docker-compose.yml" up -d 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Docker start failed or not installed. Use -SkipDocker if Postgres is already running." -ForegroundColor Yellow
        } else {
            Write-Host "Waiting for Postgres to be ready..." -ForegroundColor Gray
            $attempts = 0
            while ($attempts -lt 25) {
                $status = docker inspect --format='{{json .State.Health.Status}}' arena360-db 2>$null
                if ($status -eq '"healthy"') {
                    Write-Host "Database ready." -ForegroundColor Green
                    break
                }
                Start-Sleep -Seconds 2
                $attempts++
            }
        }
    } else {
        Write-Host "No docker-compose.yml found. Assuming Postgres is already running." -ForegroundColor Gray
    }
} else {
    Write-Host "[1/4] Skipping Docker (using existing DB)." -ForegroundColor Gray
}

# 2. Launch app
Write-Host "[2/4] Starting Backend (NestJS) and Frontend (Vite)..." -ForegroundColor Cyan

if ($SingleWindow) {
    Write-Host "Running both in one window (concurrently)..." -ForegroundColor Gray
    npm run dev:all
} else {
    # Two separate windows so you can see logs for each
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\arena360-api'; npm run start:dev"
    Start-Sleep -Seconds 1
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root'; npm run dev"
    Write-Host "[3/4] Backend and Frontend windows opened." -ForegroundColor Green
}

Write-Host "[4/4] Done." -ForegroundColor Green
Write-Host "---------------------------------------------------" -ForegroundColor Yellow
Write-Host "  Backend API:  http://localhost:3000" -ForegroundColor White
Write-Host "  Frontend UI:  http://localhost:5173" -ForegroundColor White
Write-Host "---------------------------------------------------" -ForegroundColor Yellow
Write-Host "Tip: If API is not ready, wait ~15s for NestJS to boot." -ForegroundColor Gray

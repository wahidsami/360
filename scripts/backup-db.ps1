# Backup Arena360 PostgreSQL database using pg_dump (no Docker).
# Usage: .\scripts\backup-db.ps1 [-OutFile "path\to\backup.sql"]
# Requires: pg_dump on PATH (e.g. from PostgreSQL installation).

param(
    [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$envPath = Join-Path $repoRoot "arena360-api\.env"

# Parse DATABASE_URL from .env if present
$dbHost = $env:PGHOST
$dbPort = $env:PGPORT
$dbUser = $env:PGUSER
$dbPass = $env:PGPASSWORD
$dbName = $env:PGDATABASE

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    if ($content -match 'DATABASE_URL="postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)') {
        $dbUser = $Matches[1]
        $dbPass = $Matches[2]
        $dbHost = $Matches[3]
        $dbPort = $Matches[4]
        $dbName = $Matches[5]
    }
}

if (-not $dbHost) { $dbHost = "localhost" }
if (-not $dbPort) { $dbPort = "5432" }
if (-not $dbUser) { $dbUser = "postgres" }
if (-not $dbName) { $dbName = "arena360" }

if (-not $OutFile) {
    $backupDir = Join-Path $repoRoot "backups"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
    $timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
    $OutFile = Join-Path $backupDir "arena360-$timestamp.sql"
}

$env:PGPASSWORD = $dbPass
try {
    & pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName --no-owner --no-acl -f $OutFile
    Write-Host "Backup written to: $OutFile"
} finally {
    $env:PGPASSWORD = $null
}

# start-dev.ps1
# Docker-free development environment startup script

$ErrorActionPreference = "Stop"
$ROOT_DIR = $PSScriptRoot
$BACKEND_PORT = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "8000" }
$FRONTEND_PORT = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "5173" }

$jobs = @()

function Start-Backend {
    Write-Host "[backend] Starting Django dev server on ${BACKEND_PORT}..." -ForegroundColor Cyan
    
    # Set environment for SQLite and development mode
    $env:USE_SQLITE = "true"
    $env:DEBUG = "true"
    $env:DJANGO_SETTINGS_MODULE = "config.settings"
    
    $job = Start-Job -ScriptBlock {
        param($rootDir, $port)
        Set-Location "$rootDir\backend"
        
        # Find Python executable
        $pythonCmd = $null
        if (Test-Path "$rootDir\.venv\Scripts\python.exe") {
            $pythonCmd = "$rootDir\.venv\Scripts\python.exe"
        } elseif (Test-Path "$rootDir\backend\venv\Scripts\python.exe") {
            $pythonCmd = "$rootDir\backend\venv\Scripts\python.exe"
        } else {
            $pythonCmd = "python"
        }
        
        # Set environment variables for this job
        $env:USE_SQLITE = "true"
        $env:DEBUG = "true"
        
        # Run migrations first
        Write-Output "[backend] Running migrations..."
        & $pythonCmd manage.py migrate
        
        # Start server
        Write-Output "[backend] Starting server..."
        & $pythonCmd manage.py runserver "0.0.0.0:$port"
    } -ArgumentList $ROOT_DIR, $BACKEND_PORT
    
    $script:jobs += $job
    Write-Host "[backend] Job started (ID: $($job.Id))" -ForegroundColor Green
}

function Start-Frontend {
    Write-Host "[frontend] Starting Vite dev server on ${FRONTEND_PORT}..." -ForegroundColor Cyan
    $job = Start-Job -ScriptBlock {
        param($rootDir, $port)
        Set-Location "$rootDir\frontend"
        npm run dev -- --host --port $port
    } -ArgumentList $ROOT_DIR, $FRONTEND_PORT
    $script:jobs += $job
    Write-Host "[frontend] Job started (ID: $($job.Id))" -ForegroundColor Green
}

function Stop-AllServices {
    Write-Host "`nShutting down services..." -ForegroundColor Yellow
    foreach ($job in $script:jobs) {
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -Force -ErrorAction SilentlyContinue
    }
}

# Set up cleanup on Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-AllServices }

try {
    Write-Host "Starting TextVerity Platform (Docker-Free Mode)" -ForegroundColor Magenta
    Write-Host "====================================================" -ForegroundColor Magenta
    Write-Host "Database: SQLite (local file)" -ForegroundColor Yellow
    Write-Host ""
    
    Start-Backend
    Start-Sleep -Seconds 3  # Give backend time to start
    Start-Frontend
    
    Write-Host "`nAll services starting..." -ForegroundColor Green
    Write-Host "Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
    Write-Host "Backend:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
    Write-Host "Admin:    http://localhost:$BACKEND_PORT/admin" -ForegroundColor Cyan
    Write-Host "`nPress Ctrl+C to stop all services.`n" -ForegroundColor Yellow
    
    # Monitor jobs and display output
    while ($true) {
        foreach ($job in $jobs) {
            $output = Receive-Job $job -ErrorAction SilentlyContinue
            if ($output) {
                $output | ForEach-Object { Write-Host $_ }
            }
            
            if ($job.State -eq "Failed" -or $job.State -eq "Stopped") {
                Write-Host "`nJob $($job.Id) has $($job.State). Checking for errors..." -ForegroundColor Red
                $errors = $job.ChildJobs[0].Error
                if ($errors) {
                    $errors | ForEach-Object { Write-Host $_.Exception.Message -ForegroundColor Red }
                }
            }
        }
        Start-Sleep -Milliseconds 500
    }
} catch {
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Stop-AllServices
}

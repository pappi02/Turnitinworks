# start-all.ps1
# PowerShell script to start all services on Windows (Native - No Docker)

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
        
        # Start server
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
        Remove-Job $job -ErrorAction SilentlyContinue
    }
}

# Set up cleanup on exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-AllServices }

try {
    Write-Host "Starting TextVerity Platform..." -ForegroundColor Magenta
    Write-Host "=================================" -ForegroundColor Magenta
    Write-Host "Mode: Native (SQLite database)" -ForegroundColor Yellow
    Write-Host ""
    
    Start-Backend
    Start-Sleep -Seconds 3
    Start-Frontend
    
    Write-Host "`nAll services running!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
    Write-Host "Backend:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
    Write-Host "Admin:    http://localhost:$BACKEND_PORT/admin" -ForegroundColor Cyan
    Write-Host "`nPress Ctrl+C to stop all services.`n" -ForegroundColor Yellow
    
    # Monitor jobs - keep services running indefinitely
    while ($true) {
        $allRunning = $true
        foreach ($job in $jobs) {
            if ($job.State -eq "Failed") {
                Write-Host "`n[ERROR] Job $($job.Id) has failed!" -ForegroundColor Red
                Receive-Job $job
                $allRunning = $false
            } elseif ($job.State -eq "Completed" -or $job.State -eq "Stopped") {
                Write-Host "`n[ERROR] Job $($job.Id) has unexpectedly stopped!" -ForegroundColor Red
                Receive-Job $job
                $allRunning = $false
            }
            # Print any output from jobs
            $output = Receive-Job $job -Keep -ErrorAction SilentlyContinue
            if ($output) {
                Write-Host $output
            }
        }
        
        # If any job failed/stopped, exit
        if (-not $allRunning) {
            break
        }
        
        Start-Sleep -Seconds 2
    }
} finally {
    Stop-AllServices
}

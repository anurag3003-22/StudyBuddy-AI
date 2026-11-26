<#
    One-click launcher for StudyBuddy AI (Windows).

    Double-click "Start StudyBuddy.bat" in the project root, or run:
        powershell -ExecutionPolicy Bypass -File scripts\start.ps1

    Options:
        -Dev          run the Vite dev server with hot reload (port 5173)
        -Port 8080    serve on a different port
        -NoBrowser    don't open the browser automatically
#>
[CmdletBinding()]
param(
    [switch]$Dev,
    [int]$Port = 8000,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Frontend = Join-Path $Root "frontend"
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "  ok  $Text" -ForegroundColor Green }
function Write-Note([string]$Text) { Write-Host "  ..  $Text" -ForegroundColor DarkGray }

function Resolve-Uv {
    $cmd = Get-Command uv -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = @(
        (Join-Path $env:APPDATA "Python\Python313\Scripts\uv.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\Scripts\uv.exe"),
        (Join-Path $env:USERPROFILE ".local\bin\uv.exe")
    )
    $candidates += Get-ChildItem (Join-Path $env:APPDATA "Python") -Filter "uv.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty FullName
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $python) { return $null }

    Write-Step "Installing uv (one time only)"
    & $python.Source -m pip install --user --quiet uv
    if ($LASTEXITCODE -ne 0) { return $null }

    $found = Get-ChildItem (Join-Path $env:APPDATA "Python") -Filter "uv.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

function Ensure-Python {
    if (Test-Path $VenvPython) {
        Write-Ok "Python environment ready"
        return
    }
    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
    if (-not $py) { throw "Python 3.12+ is required. Install Python from https://www.python.org/downloads/ and retry." }
    $versionOutput = & $py.Source --version 2>&1
    Write-Note "Detected $versionOutput (StudyBuddy requires Python 3.12+)"

    Write-Step "Setting up Python environment (first run, ~1 min)"
    $uv = Resolve-Uv
    if (-not $uv) {
        throw "Could not find or install 'uv'. Install it from https://docs.astral.sh/uv/ then run this again."
    }
    & $uv sync
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $VenvPython)) {
        throw "'uv sync' failed. Check your internet connection and try again."
    }
    Write-Ok "Python environment ready"
}

function Ensure-Npm {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw "Node.js 20+ is required to build the UI. Install it from https://nodejs.org then run this again."
    }
    if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
        Write-Step "Installing frontend dependencies (first run)"
        & npm install --prefix $Frontend
        if ($LASTEXITCODE -ne 0) { throw "'npm install' failed." }
    }
}

function Ensure-Frontend {
    $distIndex = Join-Path $Frontend "dist\index.html"
    $needsBuild = -not (Test-Path $distIndex)

    if (-not $needsBuild) {
        $built = (Get-Item $distIndex).LastWriteTimeUtc
        $sources = @(
            (Join-Path $Frontend "src"),
            (Join-Path $Frontend "index.html"),
            (Join-Path $Frontend "package.json"),
            (Join-Path $Frontend "vite.config.ts")
        )
        $newer = Get-ChildItem $sources -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTimeUtc -gt $built } |
            Select-Object -First 1
        if ($newer) {
            Write-Note "UI sources changed since the last build"
            $needsBuild = $true
        }
    }

    if (-not $needsBuild) {
        Write-Ok "Frontend build is up to date"
        return
    }

    Ensure-Npm
    Write-Step "Building frontend"
    & npm run build --prefix $Frontend
    if ($LASTEXITCODE -ne 0) { throw "'npm run build' failed." }
    Write-Ok "Frontend built"
}

function Assert-PortFree {
    $listening = $null
    try {
        $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    } catch {
        $listening = $null
    }
    if ($listening) {
        throw "Port $Port is already in use. Try: Start StudyBuddy.bat -Port 8080"
    }
}

function Open-When-Ready([string]$Url) {
    Start-Job -ScriptBlock {
        param($target)
        for ($i = 0; $i -lt 180; $i++) {
            try {
                Invoke-WebRequest -Uri "$target/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
                Start-Process $target
                return
            } catch {
                Start-Sleep -Milliseconds 500
            }
        }
    } -ArgumentList $Url | Out-Null
}

try {
    Ensure-Python

    if ($Dev) {
        Ensure-Npm
        Assert-PortFree
        $env:VITE_AGENT_TARGET = "http://localhost:$Port"

        Write-Step "Starting API on http://localhost:$Port"
        $api = Start-Process -FilePath $VenvPython `
            -ArgumentList @("-m", "uvicorn", "studybuddy.api:app", "--reload", "--host", "127.0.0.1", "--port", "$Port") `
            -NoNewWindow -PassThru

        if (-not $NoBrowser) { Open-When-Ready "http://localhost:5173" }

        Write-Host ""
        Write-Host "  StudyBuddy AI (dev)  ->  http://localhost:5173" -ForegroundColor Green
        Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
        Write-Host ""

        try {
            & npm run dev --prefix $Frontend
        } finally {
            if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue }
        }
        exit 0
    }

    Ensure-Frontend
    Assert-PortFree

    $url = "http://localhost:$Port"
    Write-Host ""
    Write-Host "  StudyBuddy AI  ->  $url" -ForegroundColor Green
    Write-Host "  API docs       ->  $url/docs" -ForegroundColor DarkGray
    Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
    Write-Host ""

    if (-not $NoBrowser) { Open-When-Ready $url }

    & $VenvPython -m uvicorn studybuddy.api:app --host 127.0.0.1 --port $Port
    exit $LASTEXITCODE
} catch {
    Write-Host ""
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

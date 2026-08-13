[CmdletBinding()]
param(
  [string]$Grep,
  [switch]$SkipDiagnostics,
  [switch]$PreflightOnly,
  [switch]$DryRun,
  [switch]$UseProduction,
  [string]$MailpitExecutable
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$envFile = Join-Path $repoRoot ".env"
$acceptanceEnvFile = Join-Path $repoRoot ".env.acceptance"
$connectedPort = 3210
$connectTimeoutMs = 1500
$mailpitSmtpPort = 1025
$mailpitHttpPort = 8025

function Test-LoopbackPort {
  param([int]$Port)

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connected = $client.ConnectAsync("127.0.0.1", $Port).Wait($connectTimeoutMs)
    return $connected -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Assert-EnvironmentFiles {
  if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    throw "Connected acceptance requires the ignored root .env file."
  }
  if (-not (Test-Path -LiteralPath $acceptanceEnvFile -PathType Leaf)) {
    throw "Connected acceptance requires the ignored root .env.acceptance overlay."
  }
  Write-Output "PREFLIGHT OK environment files present"
}

function Assert-ConnectedPortFree {
  $listener = Get-NetTCPConnection -LocalPort $connectedPort -State Listen -ErrorAction SilentlyContinue
  if ($listener) {
    throw "Connected acceptance port $connectedPort is already in use. Inspect its owner before cleanup."
  }
  Write-Output "PREFLIGHT OK port $connectedPort free"
}

function Assert-Mailpit {
  $smtpReady = Test-LoopbackPort -Port $mailpitSmtpPort
  $httpReady = Test-LoopbackPort -Port $mailpitHttpPort

  if ($smtpReady -and $httpReady) {
    Write-Output "PREFLIGHT OK Mailpit SMTP and HTTP reachable"
    return
  }

  if ($smtpReady -or $httpReady) {
    throw "Mailpit is only partially reachable; inspect ports 1025 and 8025 before running acceptance."
  }

  if ([string]::IsNullOrWhiteSpace($MailpitExecutable)) {
    throw "Mailpit is down. Pass -MailpitExecutable with the local executable path to start it."
  }

  $resolvedMailpit = (Resolve-Path -LiteralPath $MailpitExecutable).Path
  $mailpitLog = Join-Path ([System.IO.Path]::GetTempPath()) "kafil-mailpit.log"
  $process = Start-Process `
    -FilePath $resolvedMailpit `
    -ArgumentList @(
      "--smtp", "127.0.0.1:1025",
      "--listen", "127.0.0.1:8025",
      "--smtp-auth-accept-any",
      "--smtp-auth-allow-insecure",
      "--quiet",
      "--log-file", $mailpitLog
    ) `
    -WindowStyle Hidden `
    -PassThru

  for ($attempt = 0; $attempt -lt 50; $attempt += 1) {
    if ($process.HasExited) {
      throw "Mailpit exited before its loopback endpoints became ready."
    }
    if ((Test-LoopbackPort -Port $mailpitSmtpPort) -and (Test-LoopbackPort -Port $mailpitHttpPort)) {
      Write-Output "PREFLIGHT OK Mailpit started PID=$($process.Id)"
      return
    }
    Start-Sleep -Milliseconds 100
  }

  throw "Mailpit did not expose ports 1025 and 8025 within 5 seconds."
}

function Assert-AcceptanceConfigurationAndDatabase {
  $probeScript = Join-Path $PSScriptRoot "connected-preflight.mjs"

  Push-Location $repoRoot
  try {
    & bun --env-file=$envFile --env-file=$acceptanceEnvFile $probeScript
    if ($LASTEXITCODE -ne 0) {
      throw "Acceptance configuration or PostgreSQL preflight failed."
    }
  } finally {
    Pop-Location
  }
}

Assert-EnvironmentFiles
Assert-ConnectedPortFree
Assert-Mailpit
Assert-AcceptanceConfigurationAndDatabase

if ($PreflightOnly) {
  Write-Output "PREFLIGHT PASS connected acceptance"
  return
}

$effectiveGrep = $Grep
if (-not $SkipDiagnostics -and -not [string]::IsNullOrWhiteSpace($Grep) -and $Grep -notmatch "(^|\|)diagnostics($|\|)") {
  $effectiveGrep = "$Grep|diagnostics"
}

if ($UseProduction) {
  $buildId = Join-Path $repoRoot "apps\web\.next-connected-acceptance-webpack\BUILD_ID"
  if (-not (Test-Path -LiteralPath $buildId -PathType Leaf)) {
    throw "Production discriminator requires the connected acceptance build. Build KAFIL_NEXT_DIST_DIR=.next-connected-acceptance-webpack first."
  }
}

$mode = if ($UseProduction) { "production" } else { "development" }
$grepLabel = if ([string]::IsNullOrWhiteSpace($effectiveGrep)) { "<complete spec>" } else { $effectiveGrep }
Write-Output "RUN MODE=$mode GREP=$grepLabel"

if ($DryRun) {
  Write-Output "DRY RUN PASS connected command prepared"
  return
}

$previousGrep = [Environment]::GetEnvironmentVariable("KAFIL_E2E_GREP", "Process")
$previousProduction = [Environment]::GetEnvironmentVariable("KAFIL_E2E_USE_PRODUCTION", "Process")
$runExit = 1

Push-Location $repoRoot
try {
  if ([string]::IsNullOrWhiteSpace($effectiveGrep)) {
    Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
  } else {
    $env:KAFIL_E2E_GREP = $effectiveGrep
  }

  if ($UseProduction) {
    $env:KAFIL_E2E_USE_PRODUCTION = "1"
  } else {
    Remove-Item Env:KAFIL_E2E_USE_PRODUCTION -ErrorAction SilentlyContinue
  }

  & bun run --cwd apps/web test:e2e:connected
  $runExit = $LASTEXITCODE
} finally {
  if ($null -eq $previousGrep) {
    Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
  } else {
    $env:KAFIL_E2E_GREP = $previousGrep
  }

  if ($null -eq $previousProduction) {
    Remove-Item Env:KAFIL_E2E_USE_PRODUCTION -ErrorAction SilentlyContinue
  } else {
    $env:KAFIL_E2E_USE_PRODUCTION = $previousProduction
  }
  Pop-Location
}

Write-Output "CONNECTED EXIT=$runExit"
exit $runExit

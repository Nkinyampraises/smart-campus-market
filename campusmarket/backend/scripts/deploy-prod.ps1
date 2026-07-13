param(
  [string]$EnvFile = "backend/.env",
  [string]$ProjectName = "campusmarket",
  [switch]$DisableStrictSsl
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

if (-not (Test-Path $EnvFile)) {
  Copy-Item "backend/.env.example" $EnvFile
}

$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') {
    return
  }

  $name, $value = $_ -split '=', 2
  $envMap[$name.Trim()] = $value.Trim()
}

if ($DisableStrictSsl) {
  $env:NPM_CONFIG_STRICT_SSL = "false"
}

$composeArgs = @("-p", $ProjectName, "--env-file", $EnvFile, "-f", "backend/docker-compose.prod.yml")

docker compose @composeArgs up -d --build

Get-Content "backend/init.sql" | docker compose @composeArgs exec -T postgres `
  psql -U ($(if ($envMap.ContainsKey("DB_USER")) { $envMap["DB_USER"] } else { "campustrade" })) `
  -d ($(if ($envMap.ContainsKey("DB_NAME")) { $envMap["DB_NAME"] } else { "campustrade" }))

function Test-Endpoint {
  param(
    [string]$Url,
    [string]$Name
  )

  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        Write-Host "Smoke test passed: $Name"
        return
      }
    } catch {
      Start-Sleep -Seconds 3
    }
  }

  Write-Error "Smoke test failed: $Name ($Url) not healthy after 90s"
}

Test-Endpoint -Url "http://localhost/health" -Name "nginx edge"
Test-Endpoint -Url "http://localhost:80/health" -Name "api gateway via nginx"
Test-Endpoint -Url "http://localhost:80/api/admin/public-stats" -Name "public stats route"

Write-Host "Deployment complete."

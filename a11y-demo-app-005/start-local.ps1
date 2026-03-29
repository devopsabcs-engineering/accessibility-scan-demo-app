# start-local.ps1 - Build and run a11y-demo-app-005 in Docker
$ErrorActionPreference = "Stop"
$ImageName = "a11y-demo-app-005"
$ContainerName = "a11y-demo-app-005-local"
$Port = 8005

$existing = docker ps -aq --filter "name=$ContainerName" 2>$null
if ($existing) {
    Write-Host "Stopping existing container..."
    docker rm -f $ContainerName | Out-Null
}

Write-Host "Building Docker image..."
docker build -t ${ImageName}:local .

Write-Host "Starting container..."
docker run -d --name $ContainerName -p ${Port}:8080 ${ImageName}:local

Write-Host ""
Write-Host "App running at: http://localhost:$Port" -ForegroundColor Green
Write-Host "Stop with: .\stop-local.ps1"

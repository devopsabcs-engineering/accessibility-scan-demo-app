# start-local.ps1 - Build and run the accessibility scan app locally in Docker
$ErrorActionPreference = "Stop"

$ImageName = "a11y-scan-demo"
$ContainerName = "a11y-scan-demo-local"
$Port = 3000

# Stop existing container if running
$existing = docker ps -aq --filter "name=$ContainerName" 2>$null
if ($existing) {
    Write-Host "Stopping existing container..."
    docker rm -f $ContainerName | Out-Null
}

Write-Host "Building Docker image..."
docker build -t ${ImageName}:local .

Write-Host "Starting container on http://localhost:$Port ..."
docker run -d --name $ContainerName -p ${Port}:3000 ${ImageName}:local

Write-Host "Container '$ContainerName' is running at http://localhost:$Port"

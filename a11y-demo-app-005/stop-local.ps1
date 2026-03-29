# stop-local.ps1 - Stop a11y-demo-app-005 container
$ContainerName = "a11y-demo-app-005-local"

$existing = docker ps -aq --filter "name=$ContainerName" 2>$null
if ($existing) {
    Write-Host "Stopping container '$ContainerName'..."
    docker rm -f $ContainerName | Out-Null
    Write-Host "Container stopped and removed."
} else {
    Write-Host "No container named '$ContainerName' found."
}

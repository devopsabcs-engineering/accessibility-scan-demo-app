<#
.SYNOPSIS
    Deploys the A11yReport Power BI project to a Fabric workspace.

.DESCRIPTION
    Uses FabricPS-PBIP module to deploy the semantic model and report
    from the PBIP project to a Microsoft Fabric workspace.

.PARAMETER WorkspaceId
    Target Fabric workspace ID (GUID).

.PARAMETER PbipPath
    Path to the PBIP project directory. Defaults to the a11y-pbi-report folder.

.PARAMETER Environment
    Deployment environment name for parameter configuration.
#>
param(
    [Parameter(Mandatory)]
    [string]$WorkspaceId,

    [string]$PbipPath = (Join-Path $PSScriptRoot '..' ),

    [string]$Environment = 'production'
)

$ErrorActionPreference = 'Stop'

# Ensure FabricPS-PBIP module is available
if (-not (Get-Module -ListAvailable -Name 'FabricPS-PBIP')) {
    Write-Host "Installing FabricPS-PBIP module..."
    Install-Module -Name 'FabricPS-PBIP' -Scope CurrentUser -Force -AllowClobber
}

Import-Module FabricPS-PBIP

# Resolve PBIP path
$resolvedPath = Resolve-Path $PbipPath
$pbipFile = Join-Path $resolvedPath 'A11yReport.pbip'

if (-not (Test-Path $pbipFile)) {
    throw "PBIP file not found at $pbipFile"
}

Write-Host "Deploying A11yReport to workspace $WorkspaceId..."
Write-Host "PBIP path: $resolvedPath"

# Apply parameter overrides if setup-parameters.ps1 has been run
$paramFile = Join-Path $resolvedPath 'parameters.json'
if (Test-Path $paramFile) {
    $params = Get-Content $paramFile | ConvertFrom-Json
    Write-Host "Applying parameter overrides from parameters.json"
}

# Deploy semantic model and report
Export-FabricItems -WorkspaceId $WorkspaceId -Path $resolvedPath

Write-Host "Deployment complete."
Write-Host ""
Write-Host "Post-deployment steps:"
Write-Host "  1. Open the semantic model in Fabric and configure data source credentials"
Write-Host "  2. Set the SAS token parameter via setup-parameters.ps1 or the Fabric UI"
Write-Host "  3. Refresh the dataset to load scan results from Blob Storage"
Write-Host "  4. Schedule automated refresh (recommended: after scan-and-store pipeline runs)"

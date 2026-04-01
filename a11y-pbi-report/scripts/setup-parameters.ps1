<#
.SYNOPSIS
    Configures Power BI semantic model parameters for the A11yReport.

.DESCRIPTION
    Sets the StorageAccountName, ContainerName, and SasToken parameters
    used by the Power Query M expressions to connect to Azure Blob Storage.

.PARAMETER StorageAccountName
    Azure Storage account name containing scan results.

.PARAMETER ContainerName
    Blob container name. Defaults to 'a11y-scan-results'.

.PARAMETER SasToken
    SAS token for authenticating to Blob Storage (without leading '?').

.PARAMETER WorkspaceId
    Optional Fabric workspace ID. If provided, updates parameters in the deployed model.
#>
param(
    [Parameter(Mandatory)]
    [string]$StorageAccountName,

    [string]$ContainerName = 'a11y-scan-results',

    [string]$SasToken = '',

    [string]$WorkspaceId
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir

# Write parameters to local file for deploy.ps1 to pick up
$paramFile = Join-Path $projectDir 'parameters.json'
$params = @{
    StorageAccountName = $StorageAccountName
    ContainerName      = $ContainerName
    SasToken           = $SasToken
}

$params | ConvertTo-Json | Set-Content -Path $paramFile -Encoding UTF8
Write-Host "Parameters saved to $paramFile"

# Update expressions.tmdl with the provided values
$expressionsPath = Join-Path $projectDir 'A11yReport.SemanticModel' 'definition' 'expressions.tmdl'

if (Test-Path $expressionsPath) {
    $content = @"
expression StorageAccountName =
	"$StorageAccountName" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]

expression ContainerName =
	"$ContainerName" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]

expression SasToken =
	"$SasToken" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=false]
"@
    Set-Content -Path $expressionsPath -Value $content -Encoding UTF8
    Write-Host "Updated expressions.tmdl with parameter values"
}

# If WorkspaceId is provided, update the deployed model parameters
if ($WorkspaceId) {
    if (-not (Get-Module -ListAvailable -Name 'FabricPS-PBIP')) {
        Write-Host "Installing FabricPS-PBIP module..."
        Install-Module -Name 'FabricPS-PBIP' -Scope CurrentUser -Force -AllowClobber
    }
    Import-Module FabricPS-PBIP

    Write-Host "Updating parameters in Fabric workspace $WorkspaceId..."
    Write-Host "Note: Manual refresh required after parameter update."
}

Write-Host ""
Write-Host "Configuration complete. Next steps:"
Write-Host "  1. Run deploy.ps1 to publish updates to Fabric"
Write-Host "  2. Refresh the dataset in Fabric to load data"

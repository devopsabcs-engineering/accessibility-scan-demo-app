# FinOps Scripts Deep Dive Research

## Research Topics

- Full content retrieval of key files from `devopsabcs-engineering/finops-scan-demo-app`
- Full content retrieval of key files from `devopsabcs-engineering/finops-scan-workshop`

## Status: Complete

---

## Repository 1: devopsabcs-engineering/finops-scan-demo-app

### 1. scripts/bootstrap-demo-apps.ps1 (Lines 0–309, FULL)

```powershell
<#
.SYNOPSIS
    Bootstrap 5 FinOps demo app repositories under the devopsabcs-engineering organization.

.DESCRIPTION
    Creates finops-demo-app-001 through finops-demo-app-005 using GitHub CLI.
    Idempotent: skips repos that already exist.
    Enables code scanning, sets topics, and configures OIDC secrets.

.NOTES
    Prerequisites:
    - GitHub CLI (gh) installed and authenticated with org admin permissions
    - Environment variables or prompted input for OIDC secrets
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$Org = 'devopsabcs-engineering',

    [Parameter()]
    [string]$ScannerRepo = 'finops-scan-demo-app'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Violation descriptions for each demo app
$DemoApps = @(
    @{ Number = '001'; Description = 'FinOps demo app 001 - Missing required tags violation';         Violations = 'missing-tags' }
    @{ Number = '002'; Description = 'FinOps demo app 002 - Oversized resources violation';           Violations = 'oversized-resources' }
    @{ Number = '003'; Description = 'FinOps demo app 003 - Orphaned resources violation';            Violations = 'orphaned-resources' }
    @{ Number = '004'; Description = 'FinOps demo app 004 - No auto-shutdown violation';              Violations = 'no-auto-shutdown' }
    @{ Number = '005'; Description = 'FinOps demo app 005 - Redundant and expensive resources';       Violations = 'redundant-resources' }
)

$Topics = @('finops', 'demo', 'azure', 'cost-governance')

# Collect OIDC values from environment variables or prompt
$AzureClientId = $env:AZURE_CLIENT_ID
$AzureTenantId = $env:AZURE_TENANT_ID
$AzureSubscriptionId = $env:AZURE_SUBSCRIPTION_ID

if (-not $AzureClientId) {
    $AzureClientId = Read-Host -Prompt 'Enter AZURE_CLIENT_ID (or press Enter to skip secret configuration)'
}
if ($AzureClientId -and -not $AzureTenantId) {
    $AzureTenantId = Read-Host -Prompt 'Enter AZURE_TENANT_ID'
}
if ($AzureClientId -and -not $AzureSubscriptionId) {
    $AzureSubscriptionId = Read-Host -Prompt 'Enter AZURE_SUBSCRIPTION_ID'
}

$ConfigureSecrets = [bool]$AzureClientId

$script:wikiInitNeeded = @()

$OrgAdminToken = $env:ORG_ADMIN_TOKEN
if (-not $OrgAdminToken) {
    $OrgAdminToken = Read-Host -Prompt 'Enter ORG_ADMIN_TOKEN for wiki push (or press Enter to skip)'
}

# Run OIDC setup if Azure CLI is logged in and secrets are being configured
if ($ConfigureSecrets) {
    $null = az account show 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nAzure CLI is logged in. Running OIDC federation setup..." -ForegroundColor Cyan
        $oidcScript = Join-Path $PSScriptRoot 'setup-oidc.ps1'
        if (Test-Path $oidcScript) {
            & $oidcScript
        }
        else {
            Write-Host "  setup-oidc.ps1 not found at $oidcScript, skipping OIDC setup." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "`nAzure CLI not logged in. Skipping OIDC setup." -ForegroundColor Yellow
        Write-Host "  Run 'az login' then './scripts/setup-oidc.ps1' manually to configure federated credentials." -ForegroundColor Yellow
    }
}

foreach ($app in $DemoApps) {
    $repoName = "finops-demo-app-$($app.Number)"
    $fullRepo = "$Org/$repoName"

    Write-Host "Processing $fullRepo..." -ForegroundColor Cyan

    # Check if repo already exists (use $LASTEXITCODE since gh is a native command)
    $null = gh repo view $fullRepo --json name 2>&1
    $repoExists = ($LASTEXITCODE -eq 0)

    if ($repoExists) {
        Write-Host "  Repo $fullRepo already exists, skipping creation." -ForegroundColor Yellow
    }
    else {
        Write-Host "  Creating $fullRepo..." -ForegroundColor Green
        gh repo create $fullRepo `
            --public `
            --description $app.Description
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ERROR: Failed to create $fullRepo. Skipping." -ForegroundColor Red
            continue
        }
    }

    # Check if repo has any commits (diskUsage is unreliable — check for default branch commits instead)
    $localAppDir = Join-Path $PSScriptRoot "..\finops-demo-app-$($app.Number)"
    $commitCount = gh api "repos/$fullRepo/commits?per_page=1" --jq 'length' 2>&1
    $repoIsEmpty = ($LASTEXITCODE -ne 0) -or ($commitCount -eq '0') -or ([string]::IsNullOrWhiteSpace($commitCount))

    if ($repoIsEmpty -and (Test-Path $localAppDir)) {
        Write-Host "  Repo is empty. Pushing demo app content from $localAppDir..." -ForegroundColor Green
        $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "finops-demo-app-$($app.Number)-$(Get-Random)"
        try {
            # Initialize a new git repo and point it at the remote
            New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
            Push-Location $tempDir
            git init -b main 2>&1 | Out-Null
            git remote add origin "https://github.com/$fullRepo.git"
            # Copy all files (including hidden dirs like .github) using robocopy for accuracy
            $resolvedAppDir = (Resolve-Path $localAppDir).Path
            Get-ChildItem -Path $resolvedAppDir -Force | ForEach-Object {
                if ($_.PSIsContainer) {
                    Copy-Item -Path $_.FullName -Destination (Join-Path $tempDir $_.Name) -Recurse -Force
                }
                else {
                    Copy-Item -Path $_.FullName -Destination $tempDir -Force
                }
            }
            git add -A
            git commit -m "feat: add FinOps demo app $($app.Number) with intentional $($app.Violations) violations AB#2118"
            git push -u origin main 2>&1
            if ($LASTEXITCODE -ne 0) {
                Pop-Location
                Write-Host "  ERROR: Push failed. Repo may already have content." -ForegroundColor Red
            }
            else {
                Pop-Location
                Write-Host "  Demo app content pushed successfully." -ForegroundColor Green
            }
        }
        catch {
            Write-Host "  Warning: Could not push demo app content: $_" -ForegroundColor Yellow
            if ((Get-Location).Path -ne $PSScriptRoot) { Pop-Location }
        }
        finally {
            if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }
    elseif ($repoIsEmpty) {
        Write-Host "  Repo is empty but no local content found at $localAppDir. Skipping push." -ForegroundColor Yellow
        Write-Host "  Topics, code scanning, and secrets require at least one commit. Skipping..." -ForegroundColor Yellow
        continue
    }

    # Set topics (requires repo to have at least one commit)
    Write-Host "  Setting topics..." -ForegroundColor Gray
    foreach ($topic in $Topics) {
        gh repo edit $fullRepo --add-topic $topic 2>$null
    }

    # Enable code scanning default setup
    Write-Host "  Enabling code scanning default setup..." -ForegroundColor Gray
    try {
        $result = gh api "repos/$fullRepo/code-scanning/default-setup" `
            -X PATCH `
            -f state=configured 2>&1
        if ($result -match '"message"') {
            Write-Host "  Could not enable code scanning (may require GHAS license or repo visibility change)." -ForegroundColor Yellow
        }
        else {
            Write-Host "  Code scanning enabled." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  Could not enable code scanning (may require GHAS license)." -ForegroundColor Yellow
    }

    # Configure OIDC secrets (requires repo to have at least one commit)
    if ($ConfigureSecrets) {
        Write-Host "  Configuring OIDC secrets..." -ForegroundColor Gray
        try {
            gh secret set AZURE_CLIENT_ID --repo $fullRepo --body $AzureClientId
            gh secret set AZURE_TENANT_ID --repo $fullRepo --body $AzureTenantId
            gh secret set AZURE_SUBSCRIPTION_ID --repo $fullRepo --body $AzureSubscriptionId
            Write-Host "  OIDC secrets configured." -ForegroundColor Green
        }
        catch {
            Write-Host "  Warning: Could not configure secrets: $_" -ForegroundColor Yellow
        }
    }

    # Create 'production' environment (required for teardown workflow approval gate)
    Write-Host "  Creating 'production' environment..." -ForegroundColor Gray
    $null = gh api "repos/$fullRepo/environments/production" --method PUT 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Environment created." -ForegroundColor Green
    }
    else {
        Write-Host "    Could not create environment (may need admin access)." -ForegroundColor Yellow
    }

    if ($OrgAdminToken) {
        Write-Host "  Configuring ORG_ADMIN_TOKEN for wiki push..." -ForegroundColor Gray
        try {
            gh secret set ORG_ADMIN_TOKEN --repo $fullRepo --body $OrgAdminToken
            Write-Host "  ORG_ADMIN_TOKEN configured." -ForegroundColor Green
        }
        catch {
            Write-Host "  Warning: Could not configure ORG_ADMIN_TOKEN: $_" -ForegroundColor Yellow
        }
    }

    # Configure VM_ADMIN_PASSWORD for app-004 (VM deployment)
    if ($app.Number -eq '004') {
        $VmAdminPassword = $env:VM_ADMIN_PASSWORD
        if (-not $VmAdminPassword) {
            $defaultPassword = 'F1nOps#Demo2026!'
            $VmAdminPassword = Read-Host -Prompt "Enter VM_ADMIN_PASSWORD for app-004 (or press Enter for default: $defaultPassword)"
            if (-not $VmAdminPassword) { $VmAdminPassword = $defaultPassword }
        }
        Write-Host "  Configuring VM_ADMIN_PASSWORD..." -ForegroundColor Gray
        try {
            gh secret set VM_ADMIN_PASSWORD --repo $fullRepo --body $VmAdminPassword
            Write-Host "  VM_ADMIN_PASSWORD configured." -ForegroundColor Green
        }
        catch {
            Write-Host "  Warning: Could not configure VM_ADMIN_PASSWORD: $_" -ForegroundColor Yellow
        }
    }

    # Initialize wiki (required before workflows can push to it)
    if ($OrgAdminToken) {
        Write-Host "  Initializing wiki..." -ForegroundColor Gray
        # Enable wiki feature on the repo
        gh repo edit $fullRepo --enable-wiki 2>$null
        $wikiUrl = "https://x-access-token:${OrgAdminToken}@github.com/${fullRepo}.wiki.git"
        $wikiTempDir = Join-Path ([System.IO.Path]::GetTempPath()) "wiki-init-$($app.Number)-$(Get-Random)"
        $null = git clone --depth 1 $wikiUrl $wikiTempDir 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    Wiki already initialized." -ForegroundColor Green
        }
        else {
            # Wiki git repo doesn't exist until the first page is created via the web UI.
            # Collect repos that need manual wiki init.
            $script:wikiInitNeeded += $fullRepo
            Write-Host "    Wiki needs manual initialization (will show link at end)." -ForegroundColor Yellow
        }
        if (Test-Path $wikiTempDir) { Remove-Item -Recurse -Force $wikiTempDir -ErrorAction SilentlyContinue }
    }
}

# Configure INFRACOST_API_KEY on the scanner repo
$scannerFullRepo = "$Org/$ScannerRepo"
$InfracostApiKey = $env:INFRACOST_API_KEY
if (-not $InfracostApiKey) {
    $InfracostApiKey = Read-Host -Prompt 'Enter INFRACOST_API_KEY for scanner repo (or press Enter to skip)'
}
if ($InfracostApiKey) {
    Write-Host "Configuring INFRACOST_API_KEY on $scannerFullRepo..." -ForegroundColor Cyan
    gh secret set INFRACOST_API_KEY --repo $scannerFullRepo --body $InfracostApiKey
    Write-Host "INFRACOST_API_KEY configured." -ForegroundColor Green
}

# Configure OIDC secrets on the scanner repo (needed for Cloud Custodian Azure access)
if ($ConfigureSecrets) {
    Write-Host "Configuring OIDC secrets on $scannerFullRepo..." -ForegroundColor Cyan
    gh secret set AZURE_CLIENT_ID --repo $scannerFullRepo --body $AzureClientId
    gh secret set AZURE_TENANT_ID --repo $scannerFullRepo --body $AzureTenantId
    gh secret set AZURE_SUBSCRIPTION_ID --repo $scannerFullRepo --body $AzureSubscriptionId
    Write-Host "OIDC secrets configured on scanner repo." -ForegroundColor Green
}

# Configure ORG_ADMIN_TOKEN on the scanner repo
if ($OrgAdminToken) {
    Write-Host "Configuring ORG_ADMIN_TOKEN on $scannerFullRepo..." -ForegroundColor Cyan
    gh secret set ORG_ADMIN_TOKEN --repo $scannerFullRepo --body $OrgAdminToken
    Write-Host "ORG_ADMIN_TOKEN configured." -ForegroundColor Green

    # Initialize scanner repo wiki
    Write-Host "Initializing scanner repo wiki..." -ForegroundColor Cyan
    gh repo edit $scannerFullRepo --enable-wiki 2>$null
    $scannerWikiUrl = "https://x-access-token:${OrgAdminToken}@github.com/${scannerFullRepo}.wiki.git"
    $scannerWikiDir = Join-Path ([System.IO.Path]::GetTempPath()) "wiki-scanner-$(Get-Random)"
    $null = git clone --depth 1 $scannerWikiUrl $scannerWikiDir 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Scanner wiki already initialized." -ForegroundColor Green
    }
    else {
        $script:wikiInitNeeded += $scannerFullRepo
        Write-Host "  Scanner wiki needs manual initialization." -ForegroundColor Yellow
    }
    if (Test-Path $scannerWikiDir) { Remove-Item -Recurse -Force $scannerWikiDir -ErrorAction SilentlyContinue }
}

# Print wiki initialization instructions if needed
if ($script:wikiInitNeeded.Count -gt 0) {
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "MANUAL STEP REQUIRED: Initialize wikis" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "GitHub requires the first wiki page to be created via the web UI." -ForegroundColor Yellow
    Write-Host "Click each link below, then click 'Save page' (default content is fine):`n" -ForegroundColor Yellow
    foreach ($repo in $script:wikiInitNeeded) {
        Write-Host "  https://github.com/$repo/wiki/_new" -ForegroundColor Cyan
    }
    Write-Host ""
}

Write-Host "`nBootstrap complete. Created/verified $($DemoApps.Count) demo app repos." -ForegroundColor Cyan
```

### 2. scripts/setup-oidc.ps1 (Lines 0–142, FULL)

```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sets up OIDC federation for GitHub Actions to authenticate with Azure.

.DESCRIPTION
    Creates or retrieves an Azure AD app registration, federated credential,
    service principal, and Reader role assignment for the finops-scan-demo-app
    repository. Idempotent — safe to run multiple times.

.EXAMPLE
    ./scripts/setup-oidc.ps1
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AppName = 'finops-scanner-github-actions'
$RepoOwner = 'devopsabcs-engineering'
$ScannerRepo = 'finops-scan-demo-app'
$Issuer = 'https://token.actions.githubusercontent.com'
$Audience = 'api://AzureADTokenExchange'

# All repos that need federated credentials (scanner + 5 demo apps)
# Each repo gets a main branch credential; demo apps also get a production environment credential for teardown
$FederatedRepos = @(
    @{ Repo = $ScannerRepo;          CredName = 'github-actions-scanner-main';      Subject = "repo:${RepoOwner}/${ScannerRepo}:ref:refs/heads/main";                  Description = "OIDC for $RepoOwner/$ScannerRepo main branch" }
    @{ Repo = 'finops-demo-app-001'; CredName = 'github-actions-demo-001-main';     Subject = "repo:${RepoOwner}/finops-demo-app-001:ref:refs/heads/main";             Description = "OIDC for $RepoOwner/finops-demo-app-001 main branch" }
    @{ Repo = 'finops-demo-app-001'; CredName = 'github-actions-demo-001-prod-env'; Subject = "repo:${RepoOwner}/finops-demo-app-001:environment:production";          Description = "OIDC for $RepoOwner/finops-demo-app-001 production environment" }
    @{ Repo = 'finops-demo-app-002'; CredName = 'github-actions-demo-002-main';     Subject = "repo:${RepoOwner}/finops-demo-app-002:ref:refs/heads/main";             Description = "OIDC for $RepoOwner/finops-demo-app-002 main branch" }
    @{ Repo = 'finops-demo-app-002'; CredName = 'github-actions-demo-002-prod-env'; Subject = "repo:${RepoOwner}/finops-demo-app-002:environment:production";          Description = "OIDC for $RepoOwner/finops-demo-app-002 production environment" }
    @{ Repo = 'finops-demo-app-003'; CredName = 'github-actions-demo-003-main';     Subject = "repo:${RepoOwner}/finops-demo-app-003:ref:refs/heads/main";             Description = "OIDC for $RepoOwner/finops-demo-app-003 main branch" }
    @{ Repo = 'finops-demo-app-003'; CredName = 'github-actions-demo-003-prod-env'; Subject = "repo:${RepoOwner}/finops-demo-app-003:environment:production";          Description = "OIDC for $RepoOwner/finops-demo-app-003 production environment" }
    @{ Repo = 'finops-demo-app-004'; CredName = 'github-actions-demo-004-main';     Subject = "repo:${RepoOwner}/finops-demo-app-004:ref:refs/heads/main";             Description = "OIDC for $RepoOwner/finops-demo-app-004 main branch" }
    @{ Repo = 'finops-demo-app-004'; CredName = 'github-actions-demo-004-prod-env'; Subject = "repo:${RepoOwner}/finops-demo-app-004:environment:production";          Description = "OIDC for $RepoOwner/finops-demo-app-004 production environment" }
    @{ Repo = 'finops-demo-app-005'; CredName = 'github-actions-demo-005-main';     Subject = "repo:${RepoOwner}/finops-demo-app-005:ref:refs/heads/main";             Description = "OIDC for $RepoOwner/finops-demo-app-005 main branch" }
    @{ Repo = 'finops-demo-app-005'; CredName = 'github-actions-demo-005-prod-env'; Subject = "repo:${RepoOwner}/finops-demo-app-005:environment:production";          Description = "OIDC for $RepoOwner/finops-demo-app-005 production environment" }
)

Write-Host '=== OIDC Federation Setup ===' -ForegroundColor Cyan

# Step 1: Get or create app registration
Write-Host "`n[1/5] Checking for existing app registration '$AppName'..."
$existingApp = az ad app list --display-name $AppName --query '[0]' -o json 2>$null | ConvertFrom-Json

if ($existingApp) {
    $appId = $existingApp.appId
    $objectId = $existingApp.id
    Write-Host "  Found existing app: $appId" -ForegroundColor Green
} else {
    Write-Host "  Creating app registration..."
    $newApp = az ad app create --display-name $AppName -o json | ConvertFrom-Json
    $appId = $newApp.appId
    $objectId = $newApp.id
    Write-Host "  Created app: $appId" -ForegroundColor Green
}

# Step 2: Create or verify federated credentials for all repos
Write-Host "`n[2/5] Configuring federated credentials for $($FederatedRepos.Count) entries..."
foreach ($fedRepo in $FederatedRepos) {
    $credName = $fedRepo.CredName
    $subject = $fedRepo.Subject
    Write-Host "  Checking credential '$credName' (subject: $subject)..."

    $existingCred = az ad app federated-credential list --id $objectId --query "[?name=='$credName']" -o json 2>$null | ConvertFrom-Json

    if ($existingCred -and $existingCred.Count -gt 0) {
        Write-Host "    Already exists" -ForegroundColor Green
    } else {
        # Also check if a credential with the same subject already exists under a different name
        $subjectMatch = az ad app federated-credential list --id $objectId --query "[?subject=='$subject']" -o json 2>$null | ConvertFrom-Json
        if ($subjectMatch -and $subjectMatch.Count -gt 0) {
            Write-Host "    Already exists (as '$($subjectMatch[0].name)')" -ForegroundColor Green
        } else {
        Write-Host "    Creating..."
        $credBody = @{
            name        = $credName
            issuer      = $Issuer
            subject     = $subject
            audiences   = @($Audience)
            description = $fedRepo.Description
        } | ConvertTo-Json -Compress

        $credBody | az ad app federated-credential create --id $objectId --parameters "@-" -o none
        Write-Host "    Created" -ForegroundColor Green
        }
    }
}

# Step 3: Create or get service principal
Write-Host "`n[3/5] Checking for existing service principal..."
$existingSp = az ad sp list --filter "appId eq '$appId'" --query '[0]' -o json 2>$null | ConvertFrom-Json

if ($existingSp) {
    $spObjectId = $existingSp.id
    Write-Host "  Service principal exists: $spObjectId" -ForegroundColor Green
} else {
    Write-Host "  Creating service principal..."
    $newSp = az ad sp create --id $appId -o json | ConvertFrom-Json
    $spObjectId = $newSp.id
    Write-Host "  Created service principal: $spObjectId" -ForegroundColor Green
}

# Step 4: Assign Contributor role on subscription (required for deployments)
Write-Host "`n[4/5] Checking Contributor role assignment..."
$subscriptionId = az account show --query 'id' -o tsv
$existingRole = az role assignment list `
    --assignee $appId `
    --role 'Contributor' `
    --scope "/subscriptions/$subscriptionId" `
    --query '[0]' -o json 2>$null | ConvertFrom-Json

if ($existingRole) {
    Write-Host "  Contributor role already assigned" -ForegroundColor Green
} else {
    Write-Host "  Assigning Contributor role on subscription..."
    az role assignment create `
        --assignee $appId `
        --role 'Contributor' `
        --scope "/subscriptions/$subscriptionId" `
        -o none
    Write-Host "  Contributor role assigned" -ForegroundColor Green
}

# Step 5: Output configuration
$tenantId = az account show --query 'tenantId' -o tsv

Write-Host "`n[5/5] Configuration for GitHub Secrets:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AZURE_CLIENT_ID:       $appId"
Write-Host "  AZURE_TENANT_ID:       $tenantId"
Write-Host "  AZURE_SUBSCRIPTION_ID: $subscriptionId"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nFederated credentials configured for:" -ForegroundColor Yellow
foreach ($fedRepo in $FederatedRepos) {
    Write-Host "  - $RepoOwner/$($fedRepo.Repo)" -ForegroundColor Yellow
}
Write-Host "`nAdd these as repository secrets via the bootstrap script:" -ForegroundColor Yellow
Write-Host "  ./scripts/bootstrap-demo-apps.ps1" -ForegroundColor Yellow
```

### 3. finops-demo-app-001/Dockerfile (FULL)

```dockerfile
FROM nginx:alpine
COPY src/index.html /usr/share/nginx/html/index.html
```

### 4. finops-demo-app-001/src/index.html (FULL)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinOps Demo App 001</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center; }
        h1 { color: #d32f2f; }
        .violation { background: #ffebee; border: 2px solid #d32f2f; border-radius: 8px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>FinOps Demo App 001</h1>
    <div class="violation">
        <h2>Missing Tags Violation</h2>
        <p>This application deploys Azure resources with <strong>zero governance tags</strong>.</p>
        <p>Expected scanner findings: All resources missing CostCenter, Owner, Environment, Application, Department, Project, and ManagedBy tags.</p>
    </div>
</body>
</html>
```

### 5. finops-demo-app-001/infra/main.bicep (Lines 0–59, FULL)

```bicep
// -----------------------------------------------------------------------
// FinOps Demo App 001 — Missing Tags Violation
// -----------------------------------------------------------------------
// This template INTENTIONALLY deploys Azure resources with ZERO tags.
// The FinOps scanner should flag every resource for missing required tags:
//   CostCenter, Owner, Environment, Application, Department, Project, ManagedBy
// -----------------------------------------------------------------------

@description('Azure region for all resources')
param location string = 'canadacentral'

@description('App Service Plan name')
param appServicePlanName string = 'asp-finops-demo-001'

@description('Web App name')
param webAppName string = 'app-finops-demo-001-${uniqueString(resourceGroup().id)}'

@description('Storage Account name')
param storageAccountName string = 'stfinops001${uniqueString(resourceGroup().id)}'

// INTENTIONAL-FINOPS-ISSUE: Missing all 7 required tags
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  // tags: {} — deliberately omitted to trigger FinOps scanner findings
}

// INTENTIONAL-FINOPS-ISSUE: Missing all 7 required tags
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
    capacity: 1
  }
  // tags: {} — deliberately omitted to trigger FinOps scanner findings
}

// INTENTIONAL-FINOPS-ISSUE: Missing all 7 required tags
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
    }
  }
  // tags: {} — deliberately omitted to trigger FinOps scanner findings
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
```

### 6. finops-demo-app-001/start-local.ps1 (FULL)

```powershell
docker build -t finops-demo-001 .
docker run -d -p 8081:80 --name finops-demo-001 finops-demo-001
Write-Host "FinOps Demo App 001 running at http://localhost:8081" -ForegroundColor Green
```

### 7. finops-demo-app-001/README.md (FULL)

```markdown
---
title: "FinOps Demo App 001 — Missing Tags Violation"
description: "Demo application that intentionally deploys Azure resources without required governance tags for FinOps scanner testing."
---

## Purpose

This demo application deploys Azure resources with **zero governance tags** to validate that the FinOps cost governance scanner correctly identifies missing tag violations.

## Intentional Violation

**Violation type:** Missing required tags

All deployed resources (Storage Account, App Service Plan, Web App) are missing all 7 required governance tags:

| # | Missing Tag | Required By |
| --- | ------------- | ------------- |
| 1 | `CostCenter` | FinOps chargeback policy |
| 2 | `Owner` | Resource ownership policy |
| 3 | `Environment` | Environment classification |
| 4 | `Application` | Application identification |
| 5 | `Department` | Organizational mapping |
| 6 | `Project` | Project tracking |
| 7 | `ManagedBy` | Management mechanism |

## Expected Scanner Findings

| Scanner | Expected Finding |
| --------- | ----------------- |
| PSRule | `Azure.Resource.UseTags` — resources missing required tags |
| Checkov | `CKV_AZURE_XXX` — missing tag governance checks |
| Cloud Custodian | `missing-tags` policy — untagged resources detected |

## Resources Deployed

- **Storage Account** (`Standard_LRS`) — no tags
- **App Service Plan** (`B1`) — no tags
- **Web App** — no tags

## Local Development

    ./start-local.ps1
    ./stop-local.ps1

## Deploy to Azure

Use the **Deploy to Azure** workflow (`Actions` > `Deploy to Azure` > `Run workflow`).

## Teardown

Use the **Teardown Azure Resources** workflow to delete the `rg-finops-demo-001` resource group.
```

### 8. README.md (Main — Structure Summary, 309 lines)

The main README contains:

- **Title:** FinOps Cost Governance Scanner
- **Architecture:** Mermaid diagram showing central scanner → IaC/Runtime/Cost scans → SARIF → GitHub Security Tab → Power BI
- **Tool Stack:** PSRule, Checkov, Cloud Custodian, Infracost
- **Demo App Repos:** 5 apps (001–005) with violations: missing tags, oversized, orphaned, no auto-shutdown, redundant
- **Prerequisites:** Azure CLI v2.50+, GitHub CLI v2.40+, PowerShell 7 v7.3+, Azure subscription, GitHub org admin
- **Secrets Configuration:** Infracost API Key, OIDC (AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID), ORG_ADMIN_TOKEN, VM_ADMIN_PASSWORD
- **Quick Start:** 6 steps (OIDC setup → bootstrap → wiki init → deploy all → scan → teardown)
- **Project Structure:** .github/agents, workflows, skills, prompts, src/converters, src/config, scripts, finops-demo-app-001-005, docs
- **Agentic Framework Integration:** 5 agents (CostAnalysis, Governance, AnomalyDetector, CostOptimizer, DeploymentCostGate)
- **Scanning Pipeline:** Weekly Monday 06:00 UTC, matrix strategy across 5 apps
- **Deployment Features:** OIDC login, Bicep deployment, static content deploy, Playwright screenshot, wiki update
- **Workflows:** finops-scan.yml, finops-cost-gate.yml, deploy-all.yml, teardown-all.yml

### 9. .github/workflows/ (Listed from README project structure)

| Workflow File | Purpose |
|---|---|
| `finops-scan.yml` | Central scan (PSRule+Checkov+Custodian) — weekly + on-demand |
| `finops-cost-gate.yml` | PR cost gate (Infracost) |
| `deploy-all.yml` | Deploy all 5 demo apps sequentially |
| `teardown-all.yml` | Teardown all 5 demo apps (requires production env approval) |

---

## Repository 2: devopsabcs-engineering/finops-scan-workshop

### 1. scripts/capture-screenshots.ps1 (Lines 0–710, FULL)

```powershell
<#
.SYNOPSIS
    Capture all workshop screenshots for FinOps Scan Workshop labs 00-07.

.DESCRIPTION
    Automates screenshot capture for 8 workshop labs using Charm freeze (terminal
    output) and Playwright (browser pages). Produces 46 PNG files organized into
    images/lab-XX/ directories. Requires the demo apps to be deployed and all
    prerequisite tools to be installed.

.NOTES
    Prerequisites:
    - freeze (Charm CLI) installed — https://github.com/charmbracelet/freeze
    - Node.js and npx installed (for Playwright)
    - GitHub CLI (gh) authenticated
    - Azure CLI (az) authenticated
    - Demo apps deployed to Azure

.EXAMPLE
    .\scripts\capture-screenshots.ps1
    Captures all 46 screenshots across 8 labs.

.EXAMPLE
    .\scripts\capture-screenshots.ps1 -LabFilter '02'
    Captures only Lab 02 screenshots.

.EXAMPLE
    .\scripts\capture-screenshots.ps1 -Theme 'monokai' -FontSize 16
    Captures all screenshots with custom theme and font size.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$OutputDir = 'images',

    [Parameter()]
    [string]$LabFilter = '',

    [Parameter()]
    [string]$Theme = 'dracula',

    [Parameter()]
    [int]$FontSize = 14,

    [Parameter()]
    [string]$Org = 'devopsabcs-engineering',

    [Parameter()]
    [string]$GitHubAuthState = 'github-auth.json',

    [Parameter()]
    [string]$AzureAuthState = 'azure-auth.json',

    [Parameter()]
    [ValidateSet('', '1', '2', '3')]
    [string]$Phase = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$FreezeCommon = @(
    '--window'
    '--theme', $Theme
    '--font.size', $FontSize
    '--padding', '20,40'
    '--border.radius', '8'
    '--shadow.blur', '4'
    '--shadow.x', '0'
    '--shadow.y', '2'
)

$script:CaptureCount = 0
$script:FailureCount = 0
$Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# ── Helper Functions ─────────────────────────────────────────────────────────

function New-LabDirectory { ... }         # Creates images/lab-XX/ dir
function Invoke-FreezeScreenshot { ... }  # Captures terminal output via freeze --execute
function Invoke-CapturedFreezeScreenshot { ... }  # Pre-captures output, then freeze renders file
function Invoke-FreezeFile { ... }        # Captures file content as screenshot with line numbers
function Invoke-PlaywrightScreenshot { ... }  # Browser screenshot via npx playwright screenshot

# ── Prerequisite Validation ──────────────────────────────────────────────────
# Validates: freeze, node, npx, gh, az are on PATH

# ── PSRule Bicep path ─────────────────────────────────────────────────────────
# Sets PSRULE_AZURE_BICEP_PATH if not already set

# ── Venv custodian path ──────────────────────────────────────────────────────
# Resolves .venv/Scripts/custodian.exe or falls back to system PATH

# ── Scanner repo path ────────────────────────────────────────────────────────
# Resolves relative path to finops-scan-demo-app sibling directory

# ── Phase Filtering ──────────────────────────────────────────────────────────
# Phase 1: All labs, excludes Azure-dependent screenshots
# Phase 2: Labs 00, 01, 04, 05 — Azure-dependent screenshots only
# Phase 3: Labs 06, 07 — GitHub web UI screenshots only

# ── Lab 00: Environment Setup ───────────────────────────────────────────────
# Screenshots: gh-version, az-login, psrule-version, checkov-version,
#              custodian-version, infracost-version, deploy-output, fork-repo

# ── Lab 01: Demo Apps and Bicep ──────────────────────────────────────────────
# Screenshots: bicep-001, bicep-002, governance-tags, demo-app-matrix,
#              azure-portal-rg, azure-portal-tags

# ── Lab 02: PSRule Scanning ──────────────────────────────────────────────────
# Screenshots: psrule-config, psrule-scan-001, psrule-sarif, psrule-scan-002, psrule-fixed

# ── Lab 03: Checkov Scanning ─────────────────────────────────────────────────
# Screenshots: checkov-scan-001, checkov-sarif, checkov-scan-005, checkov-vs-psrule

# ── Lab 04: Cloud Custodian ──────────────────────────────────────────────────
# Screenshots: custodian-policy, custodian-tags, custodian-orphans,
#              custodian-rightsizing, custodian-json, custodian-sarif

# ── Lab 05: Infracost ────────────────────────────────────────────────────────
# Screenshots: infracost-config, infracost-breakdown, infracost-diff,
#              infracost-sarif, cost-gate-workflow

# ── Lab 06: SARIF and Security Tab ───────────────────────────────────────────
# Screenshots: sarif-structure, gh-api-upload, security-tab, alert-detail, alert-triage

# ── Lab 07: GitHub Actions and Cost Gates ────────────────────────────────────
# Screenshots: scan-workflow, oidc-setup, workflow-run, matrix-jobs,
#              sarif-artifacts, cost-gate-pr, deploy-teardown

# ── Summary ──────────────────────────────────────────────────────────────────
$Stopwatch.Stop()
$Elapsed = $Stopwatch.Elapsed
Write-Host "  Captured:  $($script:CaptureCount)"
Write-Host "  Failed:    $($script:FailureCount)"
Write-Host "  Elapsed:   $($Elapsed.ToString('mm\:ss'))"
```

**Key architecture of capture-screenshots.ps1:**

- **710 lines** total
- **4 capture methods:** `Invoke-FreezeScreenshot` (terminal commands), `Invoke-CapturedFreezeScreenshot` (pre-capture then render), `Invoke-FreezeFile` (file content with line numbers), `Invoke-PlaywrightScreenshot` (browser pages)
- **3 phases:** Phase 1 (local tools), Phase 2 (Azure-dependent), Phase 3 (GitHub web UI)
- **46 screenshots** across 8 labs (00–07)
- **Tools required:** Charm freeze CLI, Node.js/npx (Playwright), gh CLI, az CLI
- **Parameterized:** OutputDir, LabFilter, Theme, FontSize, Org, auth state files, Phase

### 2. README.md (FULL)

```markdown
# FinOps Cost Governance Workshop

[![Use this template](https://img.shields.io/badge/Use%20this-template-blue)](https://github.com/devopsabcs-engineering/finops-scan-workshop/generate)

Learn to scan Azure infrastructure for cost governance violations using four open-source tools—PSRule, Checkov, Cloud Custodian, and Infracost—producing SARIF output for GitHub Security tab integration.

## Architecture

(Mermaid diagram: IaC Scanners + Runtime Scanners → Demo Apps → SARIF → GitHub Security Tab + Power BI Dashboard)

## Labs

| Lab | Title | Duration | Level |
|-----|-------|----------|-------|
| 00 | Prerequisites and Environment Setup | 30 min | Beginner |
| 01 | Explore the Demo Apps and FinOps Violations | 25 min | Beginner |
| 02 | PSRule — Infrastructure as Code Analysis | 35 min | Intermediate |
| 03 | Checkov — Static Policy Scanning | 30 min | Intermediate |
| 04 | Cloud Custodian — Runtime Resource Scanning | 40 min | Intermediate |
| 05 | Infracost — Cost Estimation and Budgeting | 35 min | Intermediate |
| 06 | SARIF Output and GitHub Security Tab | 30 min | Intermediate |
| 07 | GitHub Actions Pipelines and Cost Gates | 45 min | Advanced |

## Tool Stack

| Tool | Focus | SARIF Output | License |
|------|-------|-------------|---------|
| PSRule for Azure | WAF Cost Optimization rules on Bicep/ARM | Native | MIT |
| Checkov | 1,000+ multi-cloud IaC policies | Native | Apache 2.0 |
| Cloud Custodian | Orphans, tagging, right-sizing on live resources | Converted | Apache 2.0 |
| Infracost | Pre-deployment cost estimates | Converted | Apache 2.0 |

## Prerequisites

- GitHub account, Azure subscription (Labs 04, 05, 07; free tier works)
- VS Code with Bicep and PowerShell extensions
- Azure CLI, GitHub CLI, PowerShell 7+
- PSRule, Checkov, Cloud Custodian, Infracost (installed during Lab 00)

## Quick Start

1. Use this template to create your own copy
2. Install prerequisite tools (Lab 00)
3. Start with Lab 01

## Delivery Tiers

| Tier | Labs | Duration | Azure Required |
|------|------|----------|---------------|
| Half-Day | 00, 01, 02, 03, 06 | ~3.5 hours | No |
| Full-Day | 00–07 (all) | ~7.25 hours | Yes |

## Contributing

See CONTRIBUTING.md

## License

MIT License
```

### 3. _config.yml

Not found directly via search — the workshop uses Jekyll with `layout: default` per `index.md` frontmatter, indicating a `_config.yml` likely exists but was not surfaced by the search tool. The `index.md` file uses `layout: default` and `permalink` frontmatter.

### 4. Lab Files

#### labs/lab-00-setup.md (FULL — 223 lines)

- **Title:** Lab 00 — Prerequisites and Environment Setup
- **Duration:** 30 minutes, Beginner
- **Exercises:**
  - 0.1: Fork the Repository (`gh repo fork devopsabcs-engineering/finops-scan-demo-app --clone`)
  - 0.2: Install Scanner Tools (PSRule module, pip install checkov, pip install c7n c7n-azure, choco install infracost)
  - 0.3: Azure Authentication (`az login`)
  - 0.4: Tool Verification (version checks for all 6 tools)
  - 0.5: Deploy Demo Apps (`./scripts/bootstrap-demo-apps.ps1` or manual `az deployment group create`)
- **Verification Checkpoint:** Repo forked, 4 tools installed, Azure CLI authenticated, at least app-001 deployed

#### labs/lab-01.md (FULL — 152 lines)

- **Title:** Lab 01 — Explore the Demo Apps and FinOps Violations
- **Duration:** 25 minutes, Beginner
- **Exercises:**
  - 1.1: Review Demo App Matrix (5 apps with violations and monthly waste estimates)
  - 1.2: Read Bicep Templates (app-001 missing tags, app-002 P3v3 oversized)
  - 1.3: Governance Tag Checklist (7 required tags with format rules)
  - 1.4: Azure Portal Exploration
- **Key Discovery:** SKU governance table: dev=B1, staging=S1, prod=P1v3

### 5. images/ Directory Structure (README inventory files)

Each lab has a `README.md` screenshot inventory in `images/lab-XX/`:

| Directory | Screenshots | Description |
|---|---|---|
| `images/lab-00/` | 8 screenshots | gh-version, az-login, psrule-version, checkov-version, custodian-version, infracost-version, deploy-output, fork-repo |
| `images/lab-01/` | 6 screenshots | bicep-001, bicep-002, governance-tags, demo-app-matrix, azure-portal-rg, azure-portal-tags |
| `images/lab-02/` | 5 screenshots | psrule-config, psrule-scan-001, psrule-sarif, psrule-scan-002, psrule-fixed |
| `images/lab-03/` | 4 screenshots | checkov-scan-001, checkov-sarif, checkov-scan-005, checkov-vs-psrule |
| `images/lab-04/` | 6 screenshots | custodian-policy, custodian-tags, custodian-orphans, custodian-rightsizing, custodian-json, custodian-sarif |
| `images/lab-05/` | 5 screenshots | infracost-config, infracost-breakdown, infracost-diff, infracost-sarif, cost-gate-workflow |
| `images/lab-06/` | 5 screenshots | sarif-structure, gh-api-upload, security-tab, alert-detail, alert-triage |
| `images/lab-07/` | 7 screenshots | scan-workflow, oidc-setup, workflow-run, matrix-jobs, sarif-artifacts, cost-gate-pr, deploy-teardown |

Also: `images/lab-dependency-diagram.mmd` — Mermaid dependency diagram

**Total: 46 screenshots across 8 labs**

---

## Files Not Fully Retrieved

| File | Status | Notes |
|---|---|---|
| `_config.yml` (workshop) | Not found | Jekyll config likely exists but not surfaced by search — `index.md` uses `layout: default` |
| `.github/workflows/*` (demo app) | Structure only | Workflow file names confirmed (finops-scan.yml, finops-cost-gate.yml, deploy-all.yml, teardown-all.yml) but full YAML content not retrieved — search returned structure reference, not full content |

---

## Key Discoveries

1. **Bootstrap Script (309 lines):** Fully idempotent — creates 5 repos, pushes demo app content from local dirs, sets OIDC/ORG_ADMIN_TOKEN/VM_ADMIN_PASSWORD secrets, creates production environments, enables code scanning, initializes wikis. Calls setup-oidc.ps1 automatically if Azure CLI is logged in.

2. **OIDC Script (142 lines):** Creates Azure AD app registration with 11 federated credentials (scanner main + 5 demo apps × 2 each: main branch + production environment). Assigns Contributor role on subscription. 5-step process: app registration → federated credentials → service principal → role assignment → output summary.

3. **Capture Screenshots Script (710 lines):** Sophisticated automation using Charm freeze (terminal) and Playwright (browser). 3-phase execution model for different environments. 46 screenshots across 8 labs. Supports filtering by lab number and phase.

4. **Workshop Structure:** 8 labs (00–07), ~7.25 hours full-day. Half-day tier skips Azure-dependent labs (04, 05, 07). Labs 02–05 can run in parallel after Lab 01. Lab dependency: 00 → 01 → (02, 03, 04, 05) → 06 → 07.

5. **Demo App Pattern:** Each app: `FROM nginx:alpine` + `COPY src/index.html`, Bicep template in `infra/main.bicep`, `start-local.ps1`/`stop-local.ps1` scripts. Color-coded HTML pages. Docker ports: 8081–8085.

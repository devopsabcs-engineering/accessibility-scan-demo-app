@description('Base name for all resources')
param appName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Docker image tag to deploy')
param imageTag string = 'latest'

@description('App Service Plan SKU')
param appServicePlanSku string = 'B1'

var acrName = replace('${appName}acr', '-', '')
var appServicePlanName = '${appName}-plan'
var webAppName = '${appName}-app'

// Azure Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// App Service Plan (Linux)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: appServicePlanSku
  }
  properties: {
    reserved: true
  }
}

// Web App for Containers
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${appName}:${imageTag}'
      appSettings: [
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acr.properties.loginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acr.listCredentials().username
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
      ]
    }
    httpsOnly: true
  }
}

@description('ACR login server')
output acrLoginServer string = acr.properties.loginServer

@description('Web app default hostname')
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'

@description('Web app name')
output webAppName string = webApp.name

@description('ACR name')
output acrName string = acr.name

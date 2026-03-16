# Login
az login

# Get Subscription ID
$SUBSCRIPTION_ID = az account show --query id -o tsv

# Create Read-Only Service Principal
$SP = az ad sp create-for-rbac `
  --name "SecurityScannerSP" `
  --role "Reader" `
  --scopes "/subscriptions/$SUBSCRIPTION_ID"

# Convert JSON output
$SP_JSON = $SP | ConvertFrom-Json

$CLIENT_ID = $SP_JSON.appId
$CLIENT_SECRET = $SP_JSON.password
$TENANT_ID = $SP_JSON.tenant

Write-Host "-------------------------------------"
Write-Host "Client ID: $CLIENT_ID"
Write-Host "Client Secret: $CLIENT_SECRET"
Write-Host "Tenant ID: $TENANT_ID"
Write-Host "Subscription ID: $SUBSCRIPTION_ID"
Write-Host "-------------------------------------"
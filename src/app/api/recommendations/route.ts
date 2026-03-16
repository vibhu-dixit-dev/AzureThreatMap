import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/auth";
import { getAzureCredentials } from "@/app/api/environment/state";

export type SecurityRecommendation = {
  id: string; // defender recommendation id
  title: string;
  description: string;
  resourceName: string;
  resourceType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Healthy" | "Unhealthy" | "NotApplicable";
  attackPathsCount: number;
  owner: string;
  remediationSteps: string;
};

// High-quality mock recommendations for the demo environment
const MOCK_RECOMMENDATIONS: SecurityRecommendation[] = [
  {
    id: "dfc-1001",
    title: "Management ports should be closed on your virtual machines",
    description: "Open management ports expose your virtual machines to a high level of risk from Internet-based attacks. These attacks attempt to brute force credentials to gain admin access to the machine.",
    resourceName: "VM-AppServer-01",
    resourceType: "Virtual Machine",
    severity: "High",
    status: "Unhealthy",
    attackPathsCount: 3,
    owner: "Unassigned",
    remediationSteps: "1. Navigate to the virtual machine.\n2. Open Networking settings.\n3. Delete or modify the inbound rules allowing SSH (22) or RDP (3389) from the internet.\n4. Use Azure Bastion or VPN for secure remote access."
  },
  {
    id: "dfc-1002",
    title: "Microsoft Defender for Storage plan should be enabled",
    description: "Enabling Microsoft Defender for Storage provides advanced threat protection for your storage accounts, detecting unusual and potentially harmful attempts to access or exploit your data.",
    resourceName: "stdiaglogsprod",
    resourceType: "Storage Account",
    severity: "Medium",
    status: "Unhealthy",
    attackPathsCount: 0,
    owner: "Security Team",
    remediationSteps: "1. Navigate to the Storage Account.\n2. Under Security, select Microsoft Defender for Cloud.\n3. Click 'Enable Microsoft Defender for Storage'."
  },
  {
    id: "dfc-1003",
    title: "System updates should be installed on your machines",
    description: "Missing security updates make your machines vulnerable to known exploits.",
    resourceName: "VM-DB-Primary",
    resourceType: "Virtual Machine",
    severity: "Critical",
    status: "Unhealthy",
    attackPathsCount: 5,
    owner: "Infrastructure Team",
    remediationSteps: "Use Azure Update Manager to schedule and install missing security and critical updates."
  },
  {
    id: "dfc-1004",
    title: "Key Vaults should have purge protection enabled",
    description: "Purge protection prevents malicious or accidental permanent deletion of secrets and keys.",
    resourceName: "kv-prod-secrets-01",
    resourceType: "Key Vault",
    severity: "High",
    status: "Unhealthy",
    attackPathsCount: 1,
    owner: "Identity Team",
    remediationSteps: "1. Open the Key Vault.\n2. Go to Properties.\n3. Turn on 'Purge protection'."
  },
  {
    id: "dfc-1005",
    title: "MFA should be enabled on accounts with owner permissions",
    description: "Multi-Factor Authentication adds a critical second layer of security to high-privilege accounts.",
    resourceName: "admin-user@tenant.onmicrosoft.com",
    resourceType: "Identity",
    severity: "Critical",
    status: "Unhealthy",
    attackPathsCount: 8,
    owner: "Unassigned",
    remediationSteps: "1. Go to Entra ID.\n2. Create a Conditional Access policy requiring MFA for all users with the Owner role."
  }
];

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const creds = getAzureCredentials(sessionId);

    // If no live credentials, return mock data
    if (!creds || !creds.subscriptions || creds.subscriptions.length === 0) {
      // Simulate network delay for demo
      await new Promise(resolve => setTimeout(resolve, 800));
      return NextResponse.json({ recommendations: MOCK_RECOMMENDATIONS });
    }

    // --- LIVE DATA FETCHING ---
    // If we have live credentials, we would fetch from Azure API.
    // For this implementation, we will fetch real data if possible, or fallback to mock if the API call fails or is not fully supported by the SP permissions.
    
    try {
      // Get token
      const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
      const params = new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        scope: "https://management.azure.com/.default",
        grant_type: "client_credentials",
      });
      
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      
      if (!tokenRes.ok) throw new Error("Failed to get token for recommendations");
      const { access_token } = await tokenRes.json();

      let liveRecs: SecurityRecommendation[] = [];

      // Query Defender for Cloud Assessments for each subscription
      // Note: In reality, fetching all Microsoft.Security/assessments can be paginated and large.
      for (const subId of creds.subscriptions) {
        const url = `https://management.azure.com/subscriptions/${subId}/providers/Microsoft.Security/assessments?api-version=2021-06-01`;
        const assmRes = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
        
        if (assmRes.ok) {
          const data = await assmRes.json();
          for (const item of data.value || []) {
            const props = item.properties || {};
            const status = props.status?.code || "Unknown";
            
            // Only show Unhealthy (or perhaps all, but we filter here for demo)
            if (status.toLowerCase() !== "healthy") {
              // Parse the resource ID to get the name and type
              const resIdParts = item.id.split('/');
              const resName = resIdParts[resIdParts.length - 3] || "Unknown Resource"; // Usually the resource name comes before providers/Microsoft.Security/assessments/...
              const resType = resIdParts[resIdParts.length - 4] || "Unknown Type";
              
              liveRecs.push({
                id: item.name,
                title: props.displayName || "Security Assessment",
                description: props.metadata?.description || "No description provided.",
                resourceName: resName,
                resourceType: resType,
                severity: (props.metadata?.severity || "Medium") as "Low" | "Medium" | "High" | "Critical",
                status: status === "Healthy" ? "Healthy" : status === "NotApplicable" ? "NotApplicable" : "Unhealthy",
                attackPathsCount: 0, // Would require attack path API integration
                owner: "Unassigned",
                remediationSteps: props.metadata?.remediationDescription || "Review Azure portal for remediation steps."
              });
            }
          }
        }
      }

      // If we found live recommendations, return them
      if (liveRecs.length > 0) {
        return NextResponse.json({ recommendations: liveRecs });
      } else {
        // Empty live environment or missing permissions to read Microsoft.Security
        return NextResponse.json({ recommendations: [], message: "No unhealthy recommendations found in the target subscriptions." });
      }

    } catch (apiErr) {
      console.error("Live recommendation fetch failed, returning mock data.", apiErr);
      return NextResponse.json({ recommendations: MOCK_RECOMMENDATIONS });
    }

  } catch (error: any) {
    console.error("Recommendations API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

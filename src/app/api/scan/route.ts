import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/auth";
import { getAzureCredentials, getCurrentEnvironment } from "@/app/api/environment/state";
import { LiveScanFinding, GraphData, GraphNode } from "@/lib/types";

// ---------------------------------------------------------------------------
// TOKEN HELPERS
// ---------------------------------------------------------------------------

async function getArmToken(creds: { tenantId: string; clientId: string; clientSecret: string }): Promise<string> {
  const url = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: "https://management.azure.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
  if (!res.ok) throw new Error(`ARM token failed: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

async function getGraphToken(creds: { tenantId: string; clientId: string; clientSecret: string }): Promise<string> {
  const url = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
  if (!res.ok) throw new Error(`Graph token failed: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

// ---------------------------------------------------------------------------
// RESOURCE ID → GRAPH NODE MATCHING
// Tries to match Azure resource IDs (e.g. /subscriptions/.../virtualMachines/myvm)
// to the existing Cytoscape graph nodes. Does NOT modify nodes — only returns IDs.
// ---------------------------------------------------------------------------

function matchNodeId(resourceId: string, nodes: GraphNode[]): string {
  if (!resourceId) return "";
  const lowerResId = resourceId.toLowerCase();
  const segments = lowerResId.split("/").filter(Boolean);
  const resourceName = segments[segments.length - 1];

  // Exact label match
  const byLabel = nodes.find(n => n.label.toLowerCase() === resourceName);
  if (byLabel) return byLabel.id;

  // Node id in resource id
  const byId = nodes.find(n => lowerResId.includes(n.id.toLowerCase()));
  if (byId) return byId.id;

  // Partial label match
  const byPartial = nodes.find(n => lowerResId.includes(n.label.toLowerCase()) && n.label.length > 3);
  if (byPartial) return byPartial.id;

  // Segment substring match
  const bySegment = nodes.find(n => {
    const lowerLabel = n.label.toLowerCase();
    return lowerLabel.length > 3 && segments.some(seg => seg.includes(lowerLabel) || lowerLabel.includes(seg));
  });
  if (bySegment) return bySegment.id;

  return "";
}

// ---------------------------------------------------------------------------
// REAL AZURE API DATA SOURCES
// These functions do NOT touch the graph at all — they just return findings.
// ---------------------------------------------------------------------------

async function scanDefender(armToken: string, subscriptionId: string, nodes: GraphNode[]): Promise<LiveScanFinding[]> {
  const findings: LiveScanFinding[] = [];
  let nextLink: string | null =
    `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/assessments?api-version=2021-06-01`;

  while (nextLink) {
    const res = await fetch(nextLink, { headers: { Authorization: `Bearer ${armToken}` } });
    if (!res.ok) break;
    const data = await res.json();

    for (const item of data.value || []) {
      const props = item.properties || {};
      if (props.status?.code !== "Unhealthy") continue;

      const rawResourceId: string = props.resourceDetails?.id || "";
      findings.push({
        id: item.name,
        nodeId: matchNodeId(rawResourceId, nodes),
        issue: props.displayName || "Security Assessment",
        severity: (props.metadata?.severity || "Medium") as LiveScanFinding["severity"],
        source: "Microsoft Defender for Cloud",
        description: props.metadata?.description || "No description provided.",
        recommendation: props.metadata?.remediationDescription || "Review the Azure portal for remediation steps.",
      });
    }
    nextLink = data.nextLink || null;
  }
  return findings;
}

async function scanActivityLogs(armToken: string, subscriptionId: string, nodes: GraphNode[]): Promise<LiveScanFinding[]> {
  const findings: LiveScanFinding[] = [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const filter = encodeURIComponent(`eventTimestamp ge '${since}' and status/value eq 'Succeeded'`);
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/microsoft.insights/eventtypes/management/values?api-version=2015-04-01&$filter=${filter}&$select=operationName,resourceId,caller,eventTimestamp,status`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${armToken}` } });
  if (!res.ok) return findings;

  const data = await res.json();
  const seen = new Set<string>();

  for (const event of data.value || []) {
    const opName: string = (event.operationName?.value || "").toLowerCase();
    const resourceId: string = event.resourceId || "";
    const caller: string = event.caller || "Unknown";

    let issue = "";
    let severity: LiveScanFinding["severity"] = "Medium";

    if (opName.includes("roleassignments/write")) { issue = `Privileged role assigned by ${caller}`; severity = "High"; }
    else if (opName.includes("microsoft.authorization/elevateaccess")) { issue = `Tenant-level access elevation by ${caller}`; severity = "Critical"; }
    else if (opName.includes("delete") && (opName.includes("keyvaults") || opName.includes("virtualmachines"))) { issue = `Critical resource deletion by ${caller}`; severity = "High"; }
    else continue;

    const dedupe = `${issue}|${resourceId}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    findings.push({
      id: `activity-${Buffer.from(dedupe).toString("base64").slice(0, 12)}`,
      nodeId: matchNodeId(resourceId, nodes),
      issue,
      severity,
      source: "Azure Activity Logs",
      description: `Detected at ${event.eventTimestamp || "unknown time"}. Caller: ${caller}.`,
      recommendation: "Review the activity log in the Azure portal and verify the action was authorized.",
    });
  }
  return findings;
}

async function scanIdentityProtection(graphToken: string, nodes: GraphNode[]): Promise<LiveScanFinding[]> {
  const findings: LiveScanFinding[] = [];
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?$filter=riskState eq 'atRisk' or riskState eq 'confirmedCompromised'",
    { headers: { Authorization: `Bearer ${graphToken}` } }
  );
  if (!res.ok) return findings;

  const data = await res.json();
  for (const user of data.value || []) {
    const upn: string = user.userPrincipalName || user.userDisplayName || user.id;
    const riskLevel: string = user.riskLevel || "medium";
    const riskState: string = user.riskState || "atRisk";

    const severity: LiveScanFinding["severity"] =
      riskLevel === "high" && riskState === "confirmedCompromised" ? "Critical" :
      riskLevel === "high" ? "High" : "Medium";

    findings.push({
      id: `idp-${user.id}`,
      nodeId: matchNodeId(upn, nodes) || matchNodeId(user.userDisplayName || "", nodes),
      issue: `Risky user detected — ${riskLevel} risk`,
      severity,
      source: "Entra ID Identity Protection",
      description: `User ${upn} flagged by Identity Protection. State: ${riskState}.`,
      recommendation: "Require MFA or reset credentials immediately. Review sign-in reports for this user.",
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// LIVE AZURE SECURITY CHECK (real APIs, no graph modification)
// ---------------------------------------------------------------------------

async function runLiveAzureSecurityCheck(
  creds: { tenantId: string; clientId: string; clientSecret: string; subscriptions: string[] },
  nodes: GraphNode[]
): Promise<LiveScanFinding[]> {
  const [armToken, graphToken] = await Promise.all([
    getArmToken(creds).catch(() => null),
    getGraphToken(creds).catch(() => null),
  ]);

  if (!armToken) throw new Error("Cannot acquire ARM token. Verify Service Principal credentials.");

  const findings: LiveScanFinding[] = [];
  for (const subId of creds.subscriptions) {
    const [def, act] = await Promise.all([
      scanDefender(armToken, subId, nodes).catch(() => [] as LiveScanFinding[]),
      scanActivityLogs(armToken, subId, nodes).catch(() => [] as LiveScanFinding[]),
    ]);
    findings.push(...def, ...act);
  }

  if (graphToken) {
    const idp = await scanIdentityProtection(graphToken, nodes).catch(() => [] as LiveScanFinding[]);
    findings.push(...idp);
  }

  return findings;
}

// ---------------------------------------------------------------------------
// MOCK SCAN — used when no Azure credentials present (demo mode)
// Based on current graph nodes; does NOT modify graph structure.
// ---------------------------------------------------------------------------

function generateMockScan(graph: GraphData): LiveScanFinding[] {
  const findings: LiveScanFinding[] = [];
  let counter = 0;

  for (const node of graph.nodes) {
    if (node.type === "VM") {
      findings.push({
        id: `mock-${++counter}`,
        nodeId: node.id,
        issue: "Management ports exposed to internet",
        severity: "High",
        source: "Defender for Cloud (Demo)",
        description: `${node.label} has NSG rules allowing inbound SSH/RDP from the public internet.`,
        recommendation: "Use Just-In-Time (JIT) VM access or Azure Bastion instead of directly exposing management ports.",
      });
    }
    if (node.type === "StorageAccount") {
      findings.push({
        id: `mock-${++counter}`,
        nodeId: node.id,
        issue: "Storage account with public blob access",
        severity: "Medium",
        source: "Defender for Cloud (Demo)",
        description: `${node.label} allows public blob or container access.`,
        recommendation: "Disable public network access and configure private endpoints.",
      });
    }
    if (node.type === "KeyVault") {
      findings.push({
        id: `mock-${++counter}`,
        nodeId: node.id,
        issue: "Key Vault diagnostic logging disabled",
        severity: "Low",
        source: "Defender for Cloud (Demo)",
        description: `Diagnostic logs not enabled for ${node.label}.`,
        recommendation: "Enable audit logs to an Azure Storage account or Log Analytics workspace.",
      });
    }
    if (node.type === "User") {
      findings.push({
        id: `mock-${++counter}`,
        nodeId: node.id,
        issue: "Suspicious sign-in activity detected",
        severity: "Critical",
        source: "Entra ID Identity Protection (Demo)",
        description: `Atypical travel or impossible travel detected for user ${node.label}.`,
        recommendation: "Investigate sign-in logs and enforce MFA or initiate a password reset.",
      });
    }
  }

  if (findings.length === 0 && graph.nodes.length > 0) {
    const target = graph.nodes.find(n => n.type === "VM") || graph.nodes[0];
    findings.push({
      id: "mock-fallback",
      nodeId: target.id,
      issue: "Misconfigured resource permissions",
      severity: "High",
      source: "Azure RBAC Analysis (Demo)",
      description: "Over-permissive role assignment detected.",
      recommendation: "Apply principle of least privilege.",
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// ROUTE HANDLER
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const sessionId = await getSessionId();
    const creds = getAzureCredentials(sessionId);
    const currentGraph = getCurrentEnvironment(sessionId);

    let findings: LiveScanFinding[] = [];

    if (creds && creds.subscriptions?.length) {
      // Real Azure environment — call live APIs, overlay results on existing graph nodes
      try {
        findings = await runLiveAzureSecurityCheck(creds, currentGraph.nodes);
      } catch (liveError: any) {
        console.warn("Live scan failed, falling back to demo mode:", liveError.message);
        findings = generateMockScan(currentGraph);
      }
    } else {
      // Demo mode — no credentials, use intelligent mock based on current graph
      await new Promise(resolve => setTimeout(resolve, 800)); // simulate scan delay
      findings = generateMockScan(currentGraph);
    }

    return NextResponse.json({ findings });

  } catch (error: any) {
    console.error("Scan API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

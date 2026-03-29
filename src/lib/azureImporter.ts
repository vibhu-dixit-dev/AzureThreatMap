import { GraphData, GraphNode, GraphEdge, NodeType, UserIdentity } from "./types";

// ─── Token Helpers ────────────────────────────────────────────────

const API_VERSIONS = {
  TENANTS: "2020-01-01",
  SUBSCRIPTIONS: "2020-01-01",
  RESOURCE_GROUPS: "2021-04-01",
  RESOURCES: "2021-04-01",
  ROLE_ASSIGNMENTS: "2022-04-01",
  ROLE_DEFINITIONS: "2022-04-01",
};

async function getToken(tenantId: string, clientId: string, clientSecret: string, scope: string) {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    grant_type: "client_credentials",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || "Authentication failed. Check your Service Principal credentials.");
  }
  return (await res.json()).access_token as string;
}

/**
 * Robust paginated GET for Azure Resource Manager
 */
async function paginatedArmGet(url: string, token: string) {
  let allResults: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const data: any = await res.json();
    allResults = [...allResults, ...(data.value || [])];
    // Azure ARM typically uses nextLink
    nextUrl = data.nextLink || null;
  }
  return { value: allResults };
}

async function graphGet(path: string, token: string) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function sanitizeId(raw: string) {
  // Azure resource IDs contain slashes ─ cytoscape needs a safe string
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ─── Main Importer ───────────────────────────────────────────────

export async function importAzureEnvironment(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<{ graph: GraphData, identity: UserIdentity }> {
  // Two tokens: one for ARM, one for Microsoft Graph
  const [armToken, graphToken] = await Promise.all([
    getToken(tenantId, clientId, clientSecret, "https://management.azure.com/.default"),
    getToken(tenantId, clientId, clientSecret, "https://graph.microsoft.com/.default").catch(() => null),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  // Fetch Identity Details
  const [tenantInfo, spInfo] = await Promise.all([
    paginatedArmGet(`https://management.azure.com/tenants?api-version=${API_VERSIONS.TENANTS}`, armToken),
    graphToken ? graphGet(`/servicePrincipals(appId='${clientId}')`, graphToken) : null
  ]);

  const identity: UserIdentity = {
    name: spInfo?.displayName || "Service Principal",
    tenant: (tenantInfo?.value as any[])?.find((t: any) => t.tenantId === tenantId)?.displayName || tenantId
  };

  function addNode(node: GraphNode) {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  }

  function addEdge(edge: GraphEdge) {
    edges.push(edge);
  }

  // ── 1. Subscriptions ──────────────────────────────────────────
  const subData = await paginatedArmGet(`https://management.azure.com/subscriptions?api-version=${API_VERSIONS.SUBSCRIPTIONS}`, armToken);
  const subscriptions: any[] = subData?.value ?? [];

  for (const sub of subscriptions) {
    const subId = sub.subscriptionId;
    addNode({ id: subId, label: sub.displayName || subId, type: "Subscription", riskScore: 5 });

    // ── 2. Resource Groups ─────────────────────────────────────
    const rgData = await paginatedArmGet(
      `https://management.azure.com/subscriptions/${subId}/resourcegroups?api-version=${API_VERSIONS.RESOURCE_GROUPS}`,
      armToken
    );
    for (const rg of rgData?.value ?? []) {
      const rgId = sanitizeId(rg.id);
      addNode({ id: rgId, label: rg.name, type: "ResourceGroup", riskScore: 2 });
      addEdge({ id: `edge-sub-rg-${rgId}`, source: subId, target: rgId, type: "CONTAINS" });

      // ── 3. Resources inside RG ─────────────────────────────
      const resData = await paginatedArmGet(
        `https://management.azure.com/subscriptions/${subId}/resourceGroups/${rg.name}/resources?api-version=${API_VERSIONS.RESOURCES}`,
        armToken
      );
      for (const resource of resData?.value ?? []) {
        const resId = sanitizeId(resource.id);
        const typeStr = (resource.type || "").toLowerCase();
        let nodeType: NodeType = "ResourceGroup";
        let risk = 1;

        if (typeStr.includes("virtualmachines")) { nodeType = "VM"; risk = 2; }
        else if (typeStr.includes("storageaccounts")) { nodeType = "StorageAccount"; risk = 3; }
        else if (typeStr.includes("vaults")) { nodeType = "KeyVault"; risk = 4; }

        addNode({ id: resId, label: resource.name, type: nodeType, riskScore: risk });
        addEdge({ id: `edge-rg-res-${resId}`, source: rgId, target: resId, type: "CONTAINS" });

        // ── 4. VM Managed Identities ─────────────────────────
        if (nodeType === "VM" && resource.identity) {
          const identity = resource.identity;
          if (identity.principalId) {
            const miId = identity.principalId;
            addNode({ id: miId, label: `MI: ${resource.name}`, type: "ManagedIdentity", riskScore: 1 });
            addEdge({ id: `edge-vm-mi-${resId}`, source: resId, target: miId, type: "HAS_IDENTITY" });
          }
          // User-assigned identities
          if (identity.userAssignedIdentities) {
            for (const [, uami] of Object.entries<any>(identity.userAssignedIdentities)) {
              const uamiId = uami.principalId;
              if (uamiId) {
                addNode({ id: uamiId, label: `UAMI: ${uamiId.substring(0, 8)}`, type: "ManagedIdentity", riskScore: 1 });
                addEdge({ id: `edge-vm-uami-${resId}-${uamiId}`, source: resId, target: uamiId, type: "HAS_IDENTITY" });
              }
            }
          }
        }
      }
    }

    // ── 5. Role Assignments (RBAC) ─────────────────────────────
    const raData = await paginatedArmGet(
      `https://management.azure.com/subscriptions/${subId}/providers/Microsoft.Authorization/roleAssignments?api-version=${API_VERSIONS.ROLE_ASSIGNMENTS}`,
      armToken
    );

    // Also fetch role definitions to get friendly names
    const rdData = await paginatedArmGet(
      `https://management.azure.com/subscriptions/${subId}/providers/Microsoft.Authorization/roleDefinitions?api-version=${API_VERSIONS.ROLE_DEFINITIONS}`,
      armToken
    );
    const roleDefMap: Record<string, string> = {};
    for (const rd of rdData?.value ?? []) {
      roleDefMap[rd.name] = rd.properties?.roleName || rd.name;
    }

    for (const ra of raData?.value ?? []) {
      const principalId = ra.properties?.principalId;
      const principalType = ra.properties?.principalType || "User";
      const scope = ra.properties?.scope || subId;
      const roleDefId = ra.properties?.roleDefinitionId?.split("/").pop() || "";
      const roleName = roleDefMap[roleDefId] || roleDefId.substring(0, 8);

      if (!principalId) continue;

      let nodeType: NodeType = "User";
      let label = `${principalType} (${principalId.substring(0, 8)}...)`;
      if (principalType === "ServicePrincipal") { nodeType = "ManagedIdentity"; label = `SP (${principalId.substring(0, 8)}...)`; }
      if (principalType === "Group") { nodeType = "Group"; label = `Group (${principalId.substring(0, 8)}...)`; }

      addNode({ id: principalId, label, type: nodeType, riskScore: 0 });

      // Determine edge target
      let targetId = subId;
      if (scope.includes("/resourceGroups/")) {
        const parts = scope.split("/");
        if (parts.length >= 5) {
          const rgName = parts[4];
          const rgNode = nodes.find(n => n.label === rgName && n.type === "ResourceGroup");
          if (rgNode) targetId = rgNode.id;
          // If it drills to a specific resource (9 parts), use the resource ID
          if (parts.length >= 9) {
            const resNode = nodes.find(n => n.id === sanitizeId(scope));
            if (resNode) targetId = resNode.id;
          }
        }
      }

      const edgeId = `edge-ra-${principalId}-${sanitizeId(targetId)}-${roleDefId.substring(0, 8)}`;
      addEdge({ id: edgeId, source: principalId, target: targetId, type: "HAS_ROLE", label: roleName });
    }
  }

  // ── 6. Azure AD Users via Microsoft Graph ──────────────────────
  if (graphToken) {
    const usersData = await graphGet("/users?$top=100&$select=id,displayName,userPrincipalName,jobTitle", graphToken);
    for (const user of usersData?.value ?? []) {
      // Only update label if node already exists (from role assignments); else add new
      const existing = nodes.find(n => n.id === user.id);
      const friendlyLabel = user.displayName || user.userPrincipalName || user.id;
      if (existing) {
        existing.label = friendlyLabel;
      } else {
        addNode({ id: user.id, label: friendlyLabel, type: "User", riskScore: 0 });
      }
    }

    // ── 7. Service Principals via Microsoft Graph ──────────────
    const spData = await graphGet("/servicePrincipals?$top=100&$select=id,displayName,appId,servicePrincipalType", graphToken);
    for (const sp of spData?.value ?? []) {
      const existing = nodes.find(n => n.id === sp.id);
      const spLabel = sp.displayName || sp.appId || sp.id;
      if (existing) {
        existing.label = spLabel;
        existing.type = "ManagedIdentity";
      } else {
        addNode({ id: sp.id, label: spLabel, type: "ManagedIdentity", riskScore: 0 });
      }
    }

    // ── 8. Groups via Microsoft Graph ─────────────────────────
    const groupsData = await graphGet("/groups?$top=100&$select=id,displayName", graphToken);
    for (const grp of groupsData?.value ?? []) {
      const existing = nodes.find(n => n.id === grp.id);
      if (existing) {
        existing.label = grp.displayName;
        existing.type = "Group";
      } else {
        addNode({ id: grp.id, label: grp.displayName, type: "Group", riskScore: 0 });
      }
    }
  }

  // ── Fallback ─────────────────────────────────────────────────
  if (nodes.length === 0) {
    addNode({ id: "dummy-rg", label: "No Access / Empty Tenant", type: "ResourceGroup", riskScore: 0 });
    addNode({ id: "sp-identity", label: "Service Principal", type: "User", riskScore: 0 });
    addEdge({ id: "edge-dummy", source: "sp-identity", target: "dummy-rg", type: "ACCESS" });
  }

  return { graph: { nodes, edges }, identity };
}

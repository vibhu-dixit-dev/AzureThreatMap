import { GraphData, GraphNode, GraphEdge, SimulationResult, NodeType, AttackStep, SecurityRecommendation, RiskLevel } from './types';

// Risk score ceilings per node type
const NODE_RISK: Record<NodeType, number> = {
  'Subscription': 5,
  'KeyVault': 4,
  'StorageAccount': 3,
  'VM': 2,
  'ManagedIdentity': 2,
  'ResourceGroup': 1,
  'User': 0,
  'Group': 0,
  'Role': 1,
};

function riskLevel(score: number): RiskLevel {
  if (score >= 4) return 'Critical';
  if (score >= 3) return 'High';
  if (score >= 2) return 'Medium';
  return 'Low';
}

export class BlastRadiusEngine {
  private data: GraphData;
  private adjacencyList: Map<string, GraphEdge[]>;
  private nodeMap: Map<string, GraphNode>;

  constructor(data: GraphData) {
    this.data = data;
    this.adjacencyList = new Map();
    this.nodeMap = new Map();

    for (const node of data.nodes) {
      this.nodeMap.set(node.id, node);
      this.adjacencyList.set(node.id, []);
    }
    for (const edge of data.edges) {
      const edges = this.adjacencyList.get(edge.source) || [];
      edges.push(edge);
      this.adjacencyList.set(edge.source, edges);
    }
  }

  public simulateBlastRadius(startNodeId: string): SimulationResult | null {
    const startNode = this.nodeMap.get(startNodeId);
    if (!startNode) return null;

    const visited = new Set<string>([startNodeId]);
    const blastRadius: GraphNode[] = [startNode];
    const paths: GraphEdge[] = [];

    const summary = {} as Record<NodeType, number>;
    for (const t of Object.keys(NODE_RISK) as NodeType[]) summary[t] = 0;

    // BFS queue stores { nodeId, depth } so we can categorise into phases
    const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];

    // Phase buckets: depth 1 = Initial Access, 2 = Lateral Movement, 3+ = Privilege Escalation
    const phaseBuckets: Record<number, { nodes: GraphNode[]; edges: GraphEdge[] }> = {
      1: { nodes: [], edges: [] },
      2: { nodes: [], edges: [] },
      3: { nodes: [], edges: [] },
    };

    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()!;
      const current = this.nodeMap.get(currentId)!;
      summary[current.type] = (summary[current.type] || 0) + 1;

      const outgoing = this.adjacencyList.get(currentId) || [];
      for (const edge of outgoing) {
        const nextPhase = Math.min(depth + 1, 3);
        if (!paths.find(p => p.id === edge.id)) {
          paths.push(edge);
          phaseBuckets[nextPhase]?.edges.push(edge);
        }
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          const targetNode = this.nodeMap.get(edge.target);
          if (targetNode) {
            blastRadius.push(targetNode);
            queue.push({ id: edge.target, depth: depth + 1 });
            phaseBuckets[nextPhase]?.nodes.push(targetNode);
          }
        }
      }
    }

    // Build attack steps
    const stepsData = [
      { phase: 'Initial Access' as const, nodes: phaseBuckets[1].nodes, edges: phaseBuckets[1].edges },
      { phase: 'Lateral Movement' as const, nodes: phaseBuckets[2].nodes, edges: phaseBuckets[2].edges },
      { phase: 'Privilege Escalation' as const, nodes: phaseBuckets[3].nodes, edges: phaseBuckets[3].edges },
    ];

    const attackSteps: AttackStep[] = stepsData.filter(s => s.nodes.length > 0);

    // Total risk
    let totalRiskScore = 0;
    for (const node of blastRadius) totalRiskScore += NODE_RISK[node.type] || 0;

    // Max possible score (if all critical nodes are accessed)
    const maxScore = 10;

    // Security Recommendations
    const recommendations: SecurityRecommendation[] = [];

    for (const node of blastRadius) {
      const outCount = (this.adjacencyList.get(node.id) || []).length;

      // Subscription-level identity with Owner/Contributor role
      if (node.type === 'Subscription') {
        const incomingEdges = paths.filter(e => e.target === node.id && e.type === 'HAS_ROLE');
        for (const edge of incomingEdges) {
          const label = (edge.label || '').toLowerCase();
          if (label.includes('owner') || label.includes('contributor')) {
            recommendations.push({
              severity: 'Critical',
              problem: `Identity has "${edge.label}" role on Subscription "${node.label}".`,
              fix: 'Apply Least Privilege: Replace with Reader or a custom role scoped to specific Resource Groups only. Remove Owner unless absolutely required.',
              affectedNodeId: edge.source,
            });
          }
        }
      }

      // KeyVault with broad access
      if (node.type === 'KeyVault') {
        recommendations.push({
          severity: 'Critical',
          problem: `Key Vault "${node.label}" is reachable from compromised identity.`,
          fix: 'Enable Azure Key Vault Firewall. Use Access Policies or RBAC with KeyVault Secrets User (read-only). Enable Soft-Delete and Purge Protection.',
          affectedNodeId: node.id,
        });
      }

      // ManagedIdentity with high outbound access
      if (node.type === 'ManagedIdentity' && outCount > 2) {
        recommendations.push({
          severity: 'High',
          problem: `Managed Identity "${node.label}" has access to ${outCount} resources.`,
          fix: 'Scope Managed Identity role assignments to specific resources, not broad resource groups or subscriptions.',
          affectedNodeId: node.id,
        });
      }

      // Storage Account without restrictions
      if (node.type === 'StorageAccount') {
        recommendations.push({
          severity: 'High',
          problem: `Storage Account "${node.label}" is reachable.`,
          fix: 'Enable Private Endpoints. Restrict access with SAS tokens scoped to specific operations. Disable public blob access.',
          affectedNodeId: node.id,
        });
      }
    }

    // Deduplicate recommendations
    const seen = new Set<string>();
    const uniqueRecs = recommendations.filter(r => {
      const key = `${r.affectedNodeId}-${r.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      compromisedNodeId: startNodeId,
      blastRadius,
      paths,
      totalRiskScore: Math.min(totalRiskScore, maxScore),
      maxScore,
      summary,
      attackSteps,
      recommendations: uniqueRecs,
    };
  }
}

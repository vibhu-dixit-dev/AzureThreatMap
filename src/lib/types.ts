export type NodeType = 
  | 'User' 
  | 'Group' 
  | 'Role' 
  | 'ResourceGroup' 
  | 'VM' 
  | 'ManagedIdentity' 
  | 'StorageAccount' 
  | 'KeyVault' 
  | 'Subscription';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  riskScore: number;
}

export type EdgeType = 
  | 'HAS_ROLE' 
  | 'ACCESS' 
  | 'MEMBER_OF' 
  | 'CONTAINS' 
  | 'HAS_IDENTITY';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface UserIdentity {
  name: string;
  tenant: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AttackStep {
  phase: 'Initial Access' | 'Lateral Movement' | 'Privilege Escalation';
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SecurityRecommendation {
  severity: RiskLevel;
  problem: string;
  fix: string;
  affectedNodeId: string;
}

export interface SimulationResult {
  compromisedNodeId: string;
  blastRadius: GraphNode[];
  paths: GraphEdge[];
  totalRiskScore: number;
  maxScore: number;
  summary: Record<NodeType, number>;
  attackSteps: AttackStep[];
  recommendations: SecurityRecommendation[];
}

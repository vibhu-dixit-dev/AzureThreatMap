import { GraphData } from './types';

export const mockAzureEnvironment: GraphData = {
  nodes: [
    // Identities
    { id: 'u1', label: 'alice@company.com', type: 'User', riskScore: 0 },
    { id: 'u2', label: 'dev@company.com', type: 'User', riskScore: 0 },
    { id: 'sp1', label: 'DevOps-Pipeline-SP', type: 'ManagedIdentity', riskScore: 0 },
    { id: 'g1', label: 'Security-Admins', type: 'Group', riskScore: 0 },

    // Subscriptions
    { id: 'sub1', label: 'Production Subscription', type: 'Subscription', riskScore: 5 },

    // Resource Groups
    { id: 'rg1', label: 'App-Backend-RG', type: 'ResourceGroup', riskScore: 2 },
    { id: 'rg2', label: 'Data-Platform-RG', type: 'ResourceGroup', riskScore: 2 },

    // Resources
    { id: 'vm1', label: 'App-Server-VM', type: 'VM', riskScore: 2 },
    { id: 'vm2', label: 'Bastion-Host-VM', type: 'VM', riskScore: 2 },
    { id: 'mi1', label: 'App-Server-MI', type: 'ManagedIdentity', riskScore: 1 },
    { id: 'st1', label: 'appdata-storage', type: 'StorageAccount', riskScore: 3 },
    { id: 'kv1', label: 'prod-secrets-kv', type: 'KeyVault', riskScore: 4 },
  ],
  edges: [
    // Subscriptions contain RGs
    { id: 'e1', source: 'sub1', target: 'rg1', type: 'CONTAINS' },
    { id: 'e2', source: 'sub1', target: 'rg2', type: 'CONTAINS' },

    // RGs contain resources
    { id: 'e3', source: 'rg1', target: 'vm1', type: 'CONTAINS' },
    { id: 'e4', source: 'rg1', target: 'vm2', type: 'CONTAINS' },
    { id: 'e5', source: 'rg2', target: 'st1', type: 'CONTAINS' },
    { id: 'e6', source: 'rg2', target: 'kv1', type: 'CONTAINS' },

    // VM Managed Identities
    { id: 'e7', source: 'vm1', target: 'mi1', type: 'HAS_IDENTITY' },

    // MI Access to data resources
    { id: 'e8', source: 'mi1', target: 'st1', type: 'ACCESS', label: 'Storage Blob Data Contributor' },
    { id: 'e9', source: 'mi1', target: 'kv1', type: 'ACCESS', label: 'Key Vault Secrets User' },

    // Role Assignments — Identities to scopes
    { id: 'e10', source: 'u1', target: 'sub1', type: 'HAS_ROLE', label: 'Owner' },
    { id: 'e11', source: 'u2', target: 'rg1', type: 'HAS_ROLE', label: 'Contributor' },
    { id: 'e12', source: 'sp1', target: 'sub1', type: 'HAS_ROLE', label: 'Contributor' },
    { id: 'e13', source: 'g1', target: 'rg2', type: 'HAS_ROLE', label: 'Reader' },
  ]
};

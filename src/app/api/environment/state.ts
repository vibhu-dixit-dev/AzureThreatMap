import { GraphData, UserIdentity } from "@/lib/types";
import { mockAzureEnvironment } from "@/lib/mockData";

interface UserState {
  graph: GraphData;
  identity?: UserIdentity;
  azureCredentials?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    subscriptions: string[];
  };
}

// Scoped in-memory store for demo purposes. 
// Maps session IDs to their respective graph and identity data.
const userStates = new Map<string, UserState>();

export function getCurrentEnvironment(sessionId: string): GraphData {
  return userStates.get(sessionId)?.graph || mockAzureEnvironment;
}

export function getUserIdentity(sessionId: string): UserIdentity {
  return userStates.get(sessionId)?.identity || { name: "Security Admin", tenant: "Demo Tenant" };
}

export function getAzureCredentials(sessionId: string) {
  return userStates.get(sessionId)?.azureCredentials;
}

export function setCurrentEnvironment(
  sessionId: string, 
  data: GraphData, 
  identity?: UserIdentity,
  azureCredentials?: { tenantId: string; clientId: string; clientSecret: string; subscriptions: string[] }
) {
  const existing = userStates.get(sessionId);
  userStates.set(sessionId, { 
    graph: data, 
    identity: identity || existing?.identity,
    azureCredentials: azureCredentials || existing?.azureCredentials
  });
}

export function resetEnvironment(sessionId: string) {
  userStates.delete(sessionId);
}

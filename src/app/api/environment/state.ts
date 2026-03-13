import { GraphData, UserIdentity } from "@/lib/types";
import { mockAzureEnvironment } from "@/lib/mockData";

interface UserState {
  graph: GraphData;
  identity?: UserIdentity;
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

export function setCurrentEnvironment(sessionId: string, data: GraphData, identity?: UserIdentity) {
  const existing = userStates.get(sessionId);
  userStates.set(sessionId, { 
    graph: data, 
    identity: identity || existing?.identity 
  });
}

export function resetEnvironment(sessionId: string) {
  userStates.delete(sessionId);
}

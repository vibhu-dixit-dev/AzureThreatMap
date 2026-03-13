import { GraphData } from "@/lib/types";
import { mockAzureEnvironment } from "@/lib/mockData";

// Scoped in-memory store for demo purposes. 
// Maps session IDs to their respective graph data.
const userStates = new Map<string, GraphData>();

export function getCurrentEnvironment(sessionId: string): GraphData {
  return userStates.get(sessionId) || mockAzureEnvironment;
}

export function setCurrentEnvironment(sessionId: string, data: GraphData) {
  userStates.set(sessionId, data);
}

export function resetEnvironment(sessionId: string) {
  userStates.delete(sessionId);
}

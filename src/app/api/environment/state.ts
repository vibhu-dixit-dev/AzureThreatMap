import { GraphData } from "@/lib/types";
import { mockAzureEnvironment } from "@/lib/mockData";

// Native in-memory store for MVP demo purposes. 
// A production app should use a true cache layer (Redis) or database.
let currentState: GraphData | null = null;

export function getCurrentEnvironment(): GraphData {
  return currentState || mockAzureEnvironment;
}

export function setCurrentEnvironment(data: GraphData) {
  currentState = data;
}

export function resetEnvironment() {
  currentState = null;
}

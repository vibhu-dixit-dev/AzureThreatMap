import { getCurrentEnvironment, getUserIdentity } from "@/app/api/environment/state";
import { getSessionId } from '@/lib/auth';
import { GraphEdge, GraphNode, UserIdentity } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET() {
  const sessionId = await getSessionId();
  const env = getCurrentEnvironment(sessionId);
  const identity = getUserIdentity(sessionId);

  // Build set of node IDs that participate in at least one edge
  const connectedIds = new Set<string>();
  env.edges.forEach((e: GraphEdge) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });

  // Return only connected nodes — strip all isolated vertices
  const filteredData = {
    nodes: env.nodes.filter((n: GraphNode) => connectedIds.has(n.id)),
    edges: env.edges,
  };

  return NextResponse.json({ graph: filteredData, identity });
}


// Support mock data import replacing via POST
export async function POST(req: Request) {
  try {
    const data = await req.json();
    return NextResponse.json({ success: true, message: "Environment imported" });
  } catch (err) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

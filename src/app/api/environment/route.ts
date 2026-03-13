import { NextResponse } from 'next/server';
import { getCurrentEnvironment } from "@/app/api/environment/state";

export async function GET() {
  const env = getCurrentEnvironment();

  // Build set of node IDs that participate in at least one edge
  const connectedIds = new Set<string>();
  env.edges.forEach(e => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });

  // Return only connected nodes — strip all isolated vertices
  const filteredData = {
    nodes: env.nodes.filter(n => connectedIds.has(n.id)),
    edges: env.edges,
  };

  return NextResponse.json(filteredData);
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

import { NextResponse } from 'next/server';
import { BlastRadiusEngine } from '@/lib/graphEngine';
import { getCurrentEnvironment } from "@/app/api/environment/state";

export async function POST(req: Request) {
  try {
    const { startNodeId } = await req.json();
    
    if (!startNodeId) {
      return NextResponse.json({ error: "startNodeId is required" }, { status: 400 });
    }

    // Initialize graph engine with current dynamic environment
    const environment = getCurrentEnvironment();
    const engine = new BlastRadiusEngine(environment);
    
    // Calculate blast radius
    const result = engine.simulateBlastRadius(startNodeId);
    
    if (!result) {
      return NextResponse.json({ error: "Node not found in graph" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 500 });
  }
}

import { importAzureEnvironment } from "@/lib/azureImporter";
import { setCurrentEnvironment } from "@/app/api/environment/state";
import { getSessionId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const sessionId = await getSessionId();
    const { tenantId, clientId, clientSecret } = await req.json();

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Attempt to authenticate and fetch the live Azure environment
    const { graph, identity } = await importAzureEnvironment(tenantId, clientId, clientSecret);
    
    // Update the live graph for this session only
    setCurrentEnvironment(sessionId, graph, identity);

    return NextResponse.json({ success: true, nodeCount: graph.nodes.length, identity });
  } catch (error: any) {
    console.error("Azure Import Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

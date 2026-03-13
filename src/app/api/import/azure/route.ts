import { NextResponse } from "next/server";
import { importAzureEnvironment } from "@/lib/azureImporter";
import { setCurrentEnvironment } from "@/app/api/environment/state";

export async function POST(req: Request) {
  try {
    const { tenantId, clientId, clientSecret } = await req.json();

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Attempt to authenticate and fetch the live Azure environment
    const graphData = await importAzureEnvironment(tenantId, clientId, clientSecret);
    
    // Update the live graph globally
    setCurrentEnvironment(graphData);

    return NextResponse.json({ success: true, nodeCount: graphData.nodes.length });
  } catch (error: any) {
    console.error("Azure Import Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

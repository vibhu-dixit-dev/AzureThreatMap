import { NextResponse } from 'next/server';
import { getCurrentEnvironment } from "@/app/api/environment/state";

export async function GET() {
  // Returns either the dynamically imported Azure data or the default mock
  return NextResponse.json(getCurrentEnvironment());
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

import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/auth";
import { resetEnvironment } from "../state";

export async function POST() {
  const sessionId = await getSessionId();
  resetEnvironment(sessionId);
  return NextResponse.json({ success: true });
}

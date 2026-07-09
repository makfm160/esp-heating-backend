import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    status: "online", 
    message: "A padlófűtés backend sikeresen kommunikál!",
    timestamp: new Date().toISOString()
  });
}
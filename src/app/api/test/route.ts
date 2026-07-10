import { NextResponse } from "next/server";

// Ezzel kikapcsoljuk a Next.js gyorsítótárazását erre a végpontra:
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ 
    status: "online", 
    message: "A padlófűtés backend sikeresen kommunikál!",
    timestamp: new Date().toISOString()
  });
}
// Példa egy Next.js App Router API végpontra (src/app/api/thermostat/data/route.ts)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { temperature, relayStatus, deviceId } = body;

    // Mentés az adatbázisba Prisma-val
    const log = await prisma.temperatureLog.create({
      data: { temperature, relayStatus, deviceId }
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    return NextResponse.json({ error: "Hibás adatok" }, { status: 400 });
  }
}
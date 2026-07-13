import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { startMqttWorker } from '../../../lib/mqttWorker';

// 🚀 EZZEL AZ EGGYEL INDÍTJUK EL A HÁTTÉRFOLYAMATOT:
// Amint a Next.js szerver megkapja az első kérést erre az API-ra, 
// az MQTT worker elindul a háttérben és ott is marad.
startMqttWorker();

export async function GET() {
  try {
    // Lekérjük az adatbázisból az utolsó méréseket a frontendnek
    const telemetries = await prisma.telemetry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // BigInt átalakítás JSON-baráttá
    const safeData = JSON.parse(
      JSON.stringify(telemetries, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json({ success: true, data: safeData });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Hiba' }, { status: 500 });
  }
}
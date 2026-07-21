import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
//import { startMqttWorker } from '../../../lib/mqttWorker';

export const dynamic = 'force-dynamic';

// startMqttWorker();

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      include: {
        sensors: {
          include: {
            telemetries: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const safeData = JSON.parse(
      JSON.stringify(devices, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json({ success: true, data: safeData });
  } catch (error) {
    console.error('❌ API lekérdezési hiba:', error);
    return NextResponse.json({ success: false, error: 'Szerverhiba' }, { status: 500 });
  }
}
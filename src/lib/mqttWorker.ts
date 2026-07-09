import mqtt from 'mqtt';
import { prisma } from './db';

export function startMqttWorker() {
  // Konténeren belül a Brix Mosquitto-ra csatlakozik (belső hálón jelszó nélkül is akár)
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://192.168.148.50:1883';
  const client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log('🚀 Next.js sikeresen csatlakozott a Mosquitto Brokerhez!');
    // Feliratkozunk minden eszköz telemetria témájára
    client.subscribe('device/+/telemetry', (err) => {
      if (!err) console.log('📥 Feliratkozva a device/+/telemetry témákra');
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      
      // Kicsomagoljuk az ESP32-től kapott JSON-t
      const { esp_mac, wifi_rssi, uptime_sec, sensor_id, sensor_type, measurement_type, unit, value } = payload;

      // Adatbázis mentés: upsertekkel (ha az ESP vagy a szenzor még nem létezik, automatikusan létrehozza)
      await prisma.telemetry.create({
        data: {
          wifiRssi: wifi_rssi,
          uptimeSec: uptime_sec,
          sensorType: sensor_type,
          measurementType: measurement_type,
          unit: unit,
          value: value,
          // Kapcsolatok kezelése:
          device: {
            connectOrCreate: {
              where: { macAddress: esp_mac },
              create: { macAddress: esp_mac, name: `Új ESP32 (${esp_mac})` }
            }
          },
          sensor: {
            connectOrCreate: {
              where: { id: sensor_id },
              create: { 
                id: sensor_id, 
                name: `Új szenzor (${sensor_id})`,
                deviceMac: esp_mac
              }
            }
          }
        }
      });

      console.log(`✅ Adat elmentve: Szenzor [${sensor_id}] -> ${value} °C`);
    } catch (error) {
      console.error('❌ Hiba az MQTT üzenet feldolgozásakor:', error);
    }
  });
}
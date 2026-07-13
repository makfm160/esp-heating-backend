import mqtt from 'mqtt';
import { prisma } from './db';

interface SensorPayload {
  id: string;
  temp: number;
}

interface IncomingPayload {
  macAddress: string;
  sensor_D15?: SensorPayload;
  sensor_D2?:  SensorPayload;
  sensor_D4?:  SensorPayload;
}

export function startMqttWorker() {
  // A te fix IP-címedet állítjuk be alapértelmezettnek, ha a process.env-ben nincs más
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://192.168.149.36:1883';
  const client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log('🚀 Next.js sikeresen csatlakozott a Mosquitto Brokerhez!');
    client.subscribe('device/+/telemetry', (err) => {
      if (!err) console.log('📥 Feliratkozva a device/+/telemetry témákra');
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const payload: IncomingPayload = JSON.parse(message.toString());
      const esp_mac = payload.macAddress;

      if (!esp_mac) {
        console.warn('⚠️ Érvénytelen payload: hiányzik a macAddress');
        return;
      }

      // Végigmegyünk a 3 lehetséges szenzor lábon, amit az ESP32 küldhet
      const sensorKeys: (keyof IncomingPayload)[] = ['sensor_D15', 'sensor_D2', 'sensor_D4'];

      for (const key of sensorKeys) {
        const sensorData = payload[key] as SensorPayload | undefined;

        // Csak akkor mentjük, ha a szenzor létezik, nem UNKNOWN és nem mérési hiba (-999)
        if (sensorData && sensorData.id !== 'UNKNOWN' && sensorData.temp !== -999.00) {
          
          await prisma.telemetry.create({
            data: {
              wifiRssi: -50, // Átmeneti fix érték, amíg az ESP-be be nem írjuk az RSSI küldést
              uptimeSec: 0,  // Átmeneti fix érték, amíg az ESP-be be nem írjuk az uptime küldést
              sensorType: 'DS18B20',
              measurementType: 'temperature',
              unit: 'C',
              value: sensorData.temp,
              
              // A te jól megírt connectOrCreate logikád:
              device: {
                connectOrCreate: {
                  where: { macAddress: esp_mac },
                  create: { macAddress: esp_mac, name: `Új ESP32 (${esp_mac.slice(-5)})` }
                }
              },
              sensor: {
                connectOrCreate: {
                  where: { id: sensorData.id },
                  create: { 
                    id: sensorData.id, 
                    name: `Új kör (${key})`,
                    deviceMac: esp_mac
                  }
                }
              }
            }
          });

          console.log(`✅ Adat elmentve: Szenzor [${sensorData.id}] (${key}) -> ${sensorData.temp} °C`);
        }
      }
    } catch (error) {
      console.error('❌ Hiba az MQTT üzenet feldolgozásakor:', error);
    }
  });
}
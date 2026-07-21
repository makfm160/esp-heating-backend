'use client';

import { useEffect, useState } from 'react';

// TypeScript típusok a backendtől kapott adatszerkezet leírására
interface Telemetry {
  id: string;
  createdAt: string;
  value: number;
  unit: string;
}

interface Sensor {
  id: string;
  name: string | null;
  telemetries: Telemetry[];
}

interface Device {
  macAddress: string;
  name: string | null;
  sensors: Sensor[];
}

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adatok lekérése a Next.js API-ról
  const fetchHeatingData = async () => {
    try {
      const response = await fetch('/api/heating');
      const json = await response.json();
      if (json.success) {
        setDevices(json.data);
        setError(null);
      } else {
        setError('A backend hibát jelzett.');
      }
    } catch (err) {
      setError('Nem sikerült elérni a fűtési API-t.');
    } finally {
      setLoading(false);
    }
  };

  // Automatikus frissítés beállítása (5 másodpercenként)
  useEffect(() => {
    fetchHeatingData(); // Első azonnali lekérés
    const interval = setInterval(fetchHeatingData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && devices.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-sans">
        <div className="text-xl animate-pulse">Fűtési rendszer adatainak betöltése...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 sm:p-12">
      {/* Fejléc */}
      <header className="max-w-5xl mx-auto mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Padlófűtés Vezérlőközpont</h1>
          <p className="text-gray-400 mt-1">Élő szenzoradatok és eszközstátuszok</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800 text-sm">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
          <span className="text-gray-300">Élő kapcsolat (5s frissítés)</span>
        </div>
      </header>

      {/* Hibaüzenet sáv */}
      {error && (
        <div className="max-w-5xl mx-auto mb-6 bg-red-950/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Eszközök és fűtési körök listázása */}
      <main className="max-w-5xl mx-auto space-y-10">
        {devices.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
            Még nem érkezett adat egyetlen ESP32-től sem a Mosquitto brókeren keresztül.
          </div>
        ) : (
          devices.map((device) => (
            <section key={device.macAddress} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
              {/* ESP32 Eszköz információk */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-800/60 gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-gray-200">{device.name || 'Ismeretlen ESP32'}</h2>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">MAC: {device.macAddress}</p>
                </div>
                <span className="text-xs bg-blue-950 text-blue-400 px-3 py-1 rounded-md border border-blue-900/50 font-medium">
                  {(device.sensors?.length || 0)} aktív kör
                </span>
              </div>

              {/* Fűtési körök kártyái (Grid elrendezésben) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(device.sensors || []).map((sensor) => {
                  const latestTelemetry = sensor.telemetries?.[0];
                  const hasData = !!latestTelemetry;
                  
                  // Dinamikus dizájn: Ha meleg a víz, kapjon egy enyhe vöröses parázst
                  const isWarm = hasData && latestTelemetry.value > 28;

                  return (
                    <div 
                      key={sensor.id} 
                      className={`transition-all duration-300 border rounded-xl p-5 flex justify-between items-center bg-gray-950/40 ${
                        isWarm 
                          ? 'border-orange-500/30 shadow-md shadow-orange-950/20' 
                          : 'border-gray-800/80'
                      }`}
                    >
                      <div>
                        <h3 className="font-medium text-gray-200 text-base">
                          {sensor.name || `Szenzor (${sensor.id.slice(0, 6)}...)`}
                        </h3>
                        <p className="text-xs font-mono text-gray-500 mt-1">ID: {sensor.id}</p>
                        {hasData && (
                          <p className="text-[11px] text-gray-500 mt-2">
                            Frissítve: {new Date(latestTelemetry.createdAt).toLocaleTimeString('hu-HU')}
                          </p>
                        )}
                      </div>

                      {/* Hőmérséklet kijelzés nagyméretben */}
                      <div className="text-right">
                        {hasData ? (
                          <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-bold font-mono tracking-tight ${
                              isWarm ? 'text-orange-400' : 'text-blue-400'
                            }`}>
                              {latestTelemetry.value.toFixed(1)}
                            </span>
                            <span className="text-gray-500 font-medium text-sm">
                              °{latestTelemetry.unit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600 italic">Nincs adat</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
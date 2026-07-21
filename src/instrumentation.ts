export async function register() {
  console.log('🔧 INSTRUMENTATION REGISTER LEFUTOTT, runtime:', process.env.NEXT_RUNTIME);
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startMqttWorker } = await import('./lib/mqttWorker');   // <- "./src/" levéve
      startMqttWorker();
    } catch (err) {
      console.error('❌ Hiba a startMqttWorker importálásakor:', err);
    }
  }
}
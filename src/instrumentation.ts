export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    if (connectionString) {
      const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
      useAzureMonitor({
        azureMonitorExporterOptions: { connectionString },
      });
    }
  }
}

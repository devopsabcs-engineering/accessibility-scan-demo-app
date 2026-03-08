export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    if (connectionString) {
      const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
      // eslint-disable-next-line react-hooks/rules-of-hooks -- not a React hook; Azure Monitor SDK naming convention
      useAzureMonitor({
        azureMonitorExporterOptions: { connectionString },
      });
    }
  }
}

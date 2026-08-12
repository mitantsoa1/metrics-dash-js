export interface MetricsDashOptions {
  publicSdkKey: string;
  host?: string;
  autoPageview?: boolean;
  autoClick?: boolean;
  autoForm?: boolean;
  autoTime?: boolean;
  inactivityThresholdSeconds?: number;
  bounceTimeThresholdSeconds?: number;
  batchIntervalMs?: number;
  debug?: boolean;
}

export interface ResolvedMetricsDashConfig {
  publicSdkKey: string;
  host: string;
  autoPageview: boolean;
  autoClick: boolean;
  autoForm: boolean;
  autoTime: boolean;
  inactivityThresholdSeconds: number;
  bounceTimeThresholdSeconds: number;
  batchIntervalMs: number;
  debug: boolean;
}

export function resolveConfig(options: MetricsDashOptions): ResolvedMetricsDashConfig {
  if (!options.publicSdkKey) {
    throw new Error('[MetricsDash SDK] publicSdkKey est requise pour initialiser le SDK.');
  }

  let host = options.host || 'http://localhost:8000';
  host = host.replace(/\/$/, '');

  return {
    publicSdkKey: options.publicSdkKey,
    host,
    autoPageview: options.autoPageview ?? true,
    autoClick: options.autoClick ?? true,
    autoForm: options.autoForm ?? true,
    autoTime: options.autoTime ?? true,
    inactivityThresholdSeconds: options.inactivityThresholdSeconds ?? 30,
    bounceTimeThresholdSeconds: options.bounceTimeThresholdSeconds ?? 10,
    batchIntervalMs: options.batchIntervalMs ?? 2000,
    debug: options.debug ?? false,
  };
}

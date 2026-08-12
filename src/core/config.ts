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

export function sanitizeHostUrl(rawHost?: string): string {
  if (!rawHost) return 'http://localhost:8000';

  let host = rawHost.trim().replace(/\/$/, '');

  // Fix malformed schemes like "http:localhost:8000", "http:/localhost:8000", "https:api.com"
  host = host.replace(/^https?:?\/*(?!\/)/i, (match) => {
    return match.toLowerCase().startsWith('https') ? 'https://' : 'http://';
  });

  // If still no scheme (e.g. "localhost:8000" or "api.metricsdash.com")
  if (!/^https?:\/\//i.test(host)) {
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      host = `http://${host}`;
    } else {
      host = `https://${host}`;
    }
  }

  try {
    const parsed = new URL(host);
    return parsed.origin;
  } catch (e) {
    return host;
  }
}

export function resolveConfig(options: MetricsDashOptions): ResolvedMetricsDashConfig {
  if (!options.publicSdkKey) {
    throw new Error('[MetricsDash SDK] publicSdkKey est requise pour initialiser le SDK.');
  }

  const host = sanitizeHostUrl(options.host);

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

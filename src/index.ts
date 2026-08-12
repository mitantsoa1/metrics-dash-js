import { MetricsDashClient } from './core/client';
import { MetricsDashOptions } from './core/config';

export { MetricsDashClient } from './core/client';
export type { MetricsDashOptions, ResolvedMetricsDashConfig } from './core/config';

export const MetricsDash = {
  init(options: MetricsDashOptions): MetricsDashClient {
    return MetricsDashClient.init(options);
  },

  getInstance(): MetricsDashClient | null {
    return MetricsDashClient.getInstance();
  },

  trackPageview(path?: string): void {
    MetricsDashClient.getInstance()?.trackPageview(path);
  },

  trackEvent(eventName: string, payload?: Record<string, any>): void {
    MetricsDashClient.getInstance()?.trackEvent(eventName, payload);
  },

  flush(): void {
    MetricsDashClient.getInstance()?.flush();
  },
};

export default MetricsDash;

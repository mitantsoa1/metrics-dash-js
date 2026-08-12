import { MetricsDashOptions, ResolvedMetricsDashConfig, resolveConfig } from './config';
import { SessionManager } from './session';
import { BeaconTransport } from '../transport/beaconTransport';
import { PageviewMonitor } from '../monitors/pageviewMonitor';
import { TimeMonitor } from '../monitors/timeMonitor';
import { ClickMonitor } from '../monitors/clickMonitor';
import { FormMonitor } from '../monitors/formMonitor';

export class MetricsDashClient {
  private static instance: MetricsDashClient | null = null;

  public readonly config: ResolvedMetricsDashConfig;
  public readonly sessionManager: SessionManager;
  public readonly transport: BeaconTransport;
  public readonly pageviewMonitor: PageviewMonitor;
  public readonly timeMonitor: TimeMonitor;
  public readonly clickMonitor: ClickMonitor;
  public readonly formMonitor: FormMonitor;

  constructor(options: MetricsDashOptions) {
    this.config = resolveConfig(options);
    this.sessionManager = new SessionManager();

    this.transport = new BeaconTransport(
      this.config,
      this.sessionManager.getVisitorId(),
      this.sessionManager.getSessionId()
    );

    this.timeMonitor = new TimeMonitor(this.config, this.transport);

    this.clickMonitor = new ClickMonitor(this.config, this.transport, () => {
      this.timeMonitor.incrementClickCount();
    });

    this.pageviewMonitor = new PageviewMonitor(this.config, this.transport, () => {
      this.timeMonitor.incrementPageviewCount();
    });

    this.formMonitor = new FormMonitor(this.config, this.transport);

    if (this.config.debug) {
      console.log('[MetricsDash SDK Initialisé]', {
        publicSdkKey: this.config.publicSdkKey,
        visitorId: this.sessionManager.getVisitorId(),
        sessionId: this.sessionManager.getSessionId(),
      });
    }
  }

  public static init(options: MetricsDashOptions): MetricsDashClient {
    if (!MetricsDashClient.instance) {
      MetricsDashClient.instance = new MetricsDashClient(options);
    }
    return MetricsDashClient.instance;
  }

  public static getInstance(): MetricsDashClient | null {
    return MetricsDashClient.instance;
  }

  public trackPageview(path?: string): void {
    this.pageviewMonitor.trackPageview(path);
  }

  public trackEvent(eventName: string, payload: Record<string, any> = {}): void {
    this.transport.enqueue({
      event_type: eventName,
      timestamp: new Date().toISOString(),
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      ...payload,
    });
  }

  public flush(): void {
    this.transport.flush();
  }

  public destroy(): void {
    this.pageviewMonitor;
    this.clickMonitor.destroy();
    this.formMonitor.destroy();
    this.timeMonitor.destroy();
    this.transport.destroy();
    MetricsDashClient.instance = null;
  }
}

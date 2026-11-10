import { MetricsDashOptions, ResolvedMetricsDashConfig, resolveConfig } from './config';
import { SessionManager } from './session';
import { BeaconTransport } from '../transport/beaconTransport';
import { PageviewMonitor } from '../monitors/pageviewMonitor';
import { TimeMonitor } from '../monitors/timeMonitor';
import { ClickMonitor } from '../monitors/clickMonitor';
import { FormMonitor } from '../monitors/formMonitor';
import { getSharedClient, setSharedClient } from './sharedClient';

export class MetricsDashClient {

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

    if (this.config.verifyKey) {
      void this.verifyKey();
    }

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

  /**
   * Vérifie la clé publique auprès du serveur (PU-26), sans bloquer l'initialisation.
   * Clé refusée : message explicite en console et envoi désactivé. Réseau indisponible : on laisse faire.
   */
  private async verifyKey(): Promise<void> {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch(`${this.config.host}/api/v1/sdk/verify`, {
        headers: { 'X-SDK-Key': this.config.publicSdkKey },
      });
      if (res.status === 401) {
        console.error(
          `[MetricsDash SDK] La clé publique "${this.config.publicSdkKey.slice(0, 12)}…" est invalide ou révoquée. ` +
            'Le tracking est désactivé : copiez la clé SDK affichée dans Instances & Clés.'
        );
        this.transport.disable();
      }
    } catch {
      // serveur injoignable : la vérification sera ignorée, le SDK réessaiera à l'envoi
    }
  }

  public static init(options: MetricsDashOptions): MetricsDashClient {
    let client = getSharedClient<MetricsDashClient>();
    if (!client) {
      client = new MetricsDashClient(options);
      setSharedClient(client);
    }
    return client;
  }

  public static getInstance(): MetricsDashClient | null {
    return getSharedClient<MetricsDashClient>();
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
    void this.transport.flush();
  }

  public destroy(): void {
    this.pageviewMonitor;
    this.clickMonitor.destroy();
    this.formMonitor.destroy();
    this.timeMonitor.destroy();
    this.transport.destroy();
    setSharedClient<MetricsDashClient>(null);
  }
}

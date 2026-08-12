import { ResolvedMetricsDashConfig } from '../core/config';

export interface TelemetryEventPayload {
  event_type: 'pageview' | 'click' | 'form_submit' | 'session_ping' | string;
  timestamp: string;
  url?: string;
  path?: string;
  title?: string;
  referrer?: string;
  selector?: string;
  element_type?: string;
  label?: string;
  form_id?: string;
  field_count?: number;
  status?: string;
  engaged_duration_s?: number;
  total_duration_s?: number;
  is_bounce?: boolean;
  [key: string]: any;
}

export class BeaconTransport {
  private queue: TelemetryEventPayload[] = [];
  private timer: number | null = null;
  private endpointUrl: string;

  constructor(
    private readonly config: ResolvedMetricsDashConfig,
    private readonly visitorId: string,
    private readonly sessionId: string
  ) {
    this.endpointUrl = `${this.config.host}/api/v1/ingest/sdk`;
    this.startBatchTimer();
    this.listenUnload();
  }

  public enqueue(event: TelemetryEventPayload): void {
    this.queue.push(event);
    if (this.config.debug) {
      console.log('[MetricsDash SDK Event]', event);
    }
    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  public flush(): void {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    const payload = {
      public_sdk_key: this.config.publicSdkKey,
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      sent_at: new Date().toISOString(),
      events: eventsToSend,
    };

    const data = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      const sent = navigator.sendBeacon(this.endpointUrl, blob);
      if (!sent) {
        this.fallbackFetch(data);
      }
    } else {
      this.fallbackFetch(data);
    }
  }

  private fallbackFetch(data: string): void {
    if (typeof fetch === 'undefined') return;
    fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SDK-Key': this.config.publicSdkKey,
      },
      body: data,
      keepalive: true,
    }).catch(() => {
      // Quiet fail
    });
  }

  private startBatchTimer(): void {
    if (typeof window === 'undefined') return;
    this.timer = window.setInterval(() => {
      this.flush();
    }, this.config.batchIntervalMs);
  }

  private listenUnload(): void {
    if (typeof window === 'undefined') return;

    const handleFlush = () => this.flush();

    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('beforeunload', handleFlush);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }

  public destroy(): void {
    if (this.timer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

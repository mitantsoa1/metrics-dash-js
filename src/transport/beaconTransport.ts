import type { ResolvedMetricsDashConfig } from '../core/config';

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

/** Dépendances injectables (tests, environnements sans window). */
export interface TransportDeps {
  fetch?: typeof fetch;
  sendBeacon?: (url: string, data: Blob) => boolean;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (id: unknown) => void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
}

const MAX_QUEUE = 200; // file bornée : au-delà, les plus anciens sont écartés (et signalés en debug)
const RETRY_DELAY_MS = 2000;

/**
 * File d'événements envoyés par lot (PU-31) :
 *  - un lot part dès `batchSize` événements OU toutes les `batchIntervalMs`
 *  - requêtes non bloquantes (fetch keepalive) ; jamais deux envois concurrents
 *  - un lot en échec est retenté une fois, dans l'ordre, puis abandonné (journalisé en debug)
 *  - navigator.sendBeacon uniquement à la fermeture / mise en arrière-plan de la page
 */
export class BeaconTransport {
  private queue: TelemetryEventPayload[] = [];
  private timer: unknown = null;
  private sending = false;
  private disabled = false;
  private readonly endpointUrl: string;
  private readonly deps: Required<Pick<TransportDeps, 'fetch'>> & TransportDeps;

  constructor(
    private readonly config: ResolvedMetricsDashConfig,
    private readonly visitorId: string,
    private readonly sessionId: string,
    deps: TransportDeps = {}
  ) {
    this.endpointUrl = `${this.config.host}/api/v1/ingest/sdk`;
    this.deps = {
      ...deps,
      fetch: deps.fetch ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (undefined as never)),
    };
    this.startBatchTimer();
    this.listenUnload();
  }

  public enqueue(event: TelemetryEventPayload): void {
    if (this.disabled) return;

    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE) {
      const dropped = this.queue.length - MAX_QUEUE;
      this.queue.splice(0, dropped);
      this.log('warn', `file pleine : ${dropped} événement(s) ancien(s) écarté(s)`);
    }
    this.log('log', '[MetricsDash SDK Event]', event);

    if (this.queue.length >= this.config.batchSize) {
      void this.flush();
    }
  }

  /** Désactive l'envoi (clé invalide) et vide la file. */
  public disable(): void {
    this.disabled = true;
    this.queue = [];
  }

  public get pending(): number {
    return this.queue.length;
  }

  /** Envoi normal (non bloquant). Ne fait rien si un envoi est déjà en cours. */
  public async flush(): Promise<void> {
    if (this.disabled || this.sending || this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.config.batchSize);
    this.sending = true;
    try {
      if (!(await this.post(batch))) {
        this.log('warn', 'envoi échoué, nouvelle tentative dans 2 s');
        await this.sleep(RETRY_DELAY_MS);
        if (!(await this.post(batch))) {
          this.log('warn', `lot abandonné après une relance (${batch.length} événement(s))`);
        }
      }
    } finally {
      this.sending = false;
    }

    if (this.queue.length >= this.config.batchSize) {
      void this.flush();
    }
  }

  /** Fermeture de page : vide toute la file via sendBeacon (aucune attente possible). */
  public flushOnUnload(): void {
    if (this.disabled) return;
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.config.batchSize);
      const data = this.serialize(batch);
      const beacon = this.deps.sendBeacon ?? (typeof navigator !== 'undefined' && navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : undefined);
      const sent = beacon ? beacon(this.endpointUrl, new Blob([data], { type: 'application/json' })) : false;
      if (!sent) {
        // Beacon refusé (taille, navigateur) : dernier recours en keepalive, sans attendre
        void this.deps.fetch?.(this.endpointUrl, this.fetchInit(data)).catch(() => undefined);
      }
    }
  }

  public destroy(): void {
    if (this.timer !== null) {
      (this.deps.clearInterval ?? ((id) => window.clearInterval(id as number)))(this.timer);
      this.timer = null;
    }
    this.flushOnUnload();
  }

  private serialize(events: TelemetryEventPayload[]): string {
    return JSON.stringify({
      public_sdk_key: this.config.publicSdkKey,
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      sent_at: new Date().toISOString(),
      events,
    });
  }

  private fetchInit(body: string): RequestInit {
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-SDK-Key': this.config.publicSdkKey },
      body,
      keepalive: true,
    };
  }

  private async post(events: TelemetryEventPayload[]): Promise<boolean> {
    try {
      const res = await this.deps.fetch(this.endpointUrl, this.fetchInit(this.serialize(events)));
      if (res.status === 401) {
        this.log('error', 'clé publique refusée par le serveur : envoi désactivé');
        this.disable();
        return true; // inutile de retenter
      }
      return res.ok;
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    const wait = this.deps.setTimeout ?? ((fn: () => void, delay: number) => setTimeout(fn, delay));
    return new Promise((resolve) => wait(() => resolve(), ms));
  }

  private startBatchTimer(): void {
    const every = this.deps.setInterval ?? (typeof window !== 'undefined' ? (fn: () => void, ms: number) => window.setInterval(fn, ms) : undefined);
    if (!every) return;
    this.timer = every(() => void this.flush(), this.config.batchIntervalMs);
  }

  private listenUnload(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('pagehide', () => this.flushOnUnload());
    window.addEventListener('beforeunload', () => this.flushOnUnload());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flushOnUnload();
    });
  }

  private log(level: 'log' | 'warn' | 'error', ...args: unknown[]): void {
    if (this.config.debug || level === 'error') {
      console[level]('[MetricsDash SDK]', ...args);
    }
  }
}

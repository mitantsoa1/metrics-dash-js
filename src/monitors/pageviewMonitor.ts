import { BeaconTransport } from '../transport/beaconTransport';
import { ResolvedMetricsDashConfig } from '../core/config';

export class PageviewMonitor {
  private lastPath: string = '';

  constructor(
    private readonly config: ResolvedMetricsDashConfig,
    private readonly transport: BeaconTransport,
    private readonly onPageviewCallback?: () => void
  ) {
    if (!this.config.autoPageview || typeof window === 'undefined') return;

    this.trackPageview();
    this.interceptSpaHistory();
  }

  public trackPageview(overridePath?: string): void {
    if (typeof window === 'undefined') return;

    const currentPath = overridePath || window.location.pathname;
    if (currentPath === this.lastPath && !overridePath) return;

    this.lastPath = currentPath;

    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = searchParams.get('utm_source') || undefined;
    const utmMedium = searchParams.get('utm_medium') || undefined;
    const utmCampaign = searchParams.get('utm_campaign') || undefined;
    const utmTerm = searchParams.get('utm_term') || undefined;
    const utmContent = searchParams.get('utm_content') || undefined;

    this.transport.enqueue({
      event_type: 'pageview',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      path: currentPath,
      title: document.title,
      referrer: document.referrer || '',
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
    });

    if (this.onPageviewCallback) {
      this.onPageviewCallback();
    }
  }

  private interceptSpaHistory(): void {
    if (typeof window === 'undefined' || typeof history === 'undefined') return;

    const self = this;
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      self.trackPageview();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      self.trackPageview();
    };

    window.addEventListener('popstate', () => {
      self.trackPageview();
    });
  }
}

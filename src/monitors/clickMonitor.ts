import { BeaconTransport } from '../transport/beaconTransport';
import { ResolvedMetricsDashConfig } from '../core/config';
import { buildCssSelector, extractSafeLabel, isElementIgnored } from '../utils/dom';

export class ClickMonitor {
  private lastClickTimestamp: number = 0;
  private lastClickSelector: string = '';

  constructor(
    private readonly config: ResolvedMetricsDashConfig,
    private readonly transport: BeaconTransport,
    private readonly onClickTracked?: () => void
  ) {
    if (!this.config.autoClick || typeof window === 'undefined') return;

    document.addEventListener('click', this.handleGlobalClick, true);
  }

  private handleGlobalClick = (event: MouseEvent): void => {
    try {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = this.findInteractiveElement(target);
      if (!interactiveEl) return;

      if (isElementIgnored(interactiveEl)) return;

      const selector = buildCssSelector(interactiveEl);
      const now = Date.now();

      // Deduplication: Ignore identical click on same selector within 300ms (e.g., double clicks)
      if (selector === this.lastClickSelector && now - this.lastClickTimestamp < 300) {
        return;
      }

      this.lastClickSelector = selector;
      this.lastClickTimestamp = now;

      const label = extractSafeLabel(interactiveEl);
      const elementType = interactiveEl.tagName.toLowerCase();

      this.transport.enqueue({
        event_type: 'click',
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        selector,
        element_type: elementType,
        label,
      });

      if (this.onClickTracked) {
        this.onClickTracked();
      }
    } catch {
      // Quiet fail to avoid disrupting user application
    }
  };

  private findInteractiveElement(el: HTMLElement | null): HTMLElement | null {
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      const tag = current.tagName.toUpperCase();
      if (
        tag === 'A' ||
        tag === 'BUTTON' ||
        current.getAttribute('role') === 'button' ||
        (tag === 'INPUT' && ['button', 'submit', 'reset', 'image'].includes((current as HTMLInputElement).type?.toLowerCase())) ||
        current.hasAttribute('data-metrics-click')
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      document.removeEventListener('click', this.handleGlobalClick, true);
    }
  }
}

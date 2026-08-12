import { BeaconTransport } from '../transport/beaconTransport';
import { ResolvedMetricsDashConfig } from '../core/config';
import { isElementIgnored } from '../utils/dom';

export class FormMonitor {
  constructor(
    private readonly config: ResolvedMetricsDashConfig,
    private readonly transport: BeaconTransport
  ) {
    if (!this.config.autoForm || typeof window === 'undefined') return;

    document.addEventListener('submit', this.handleFormSubmit, true);
  }

  private handleFormSubmit = (event: SubmitEvent): void => {
    try {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.tagName !== 'FORM') return;

      if (isElementIgnored(form)) return;

      const formId = form.id || form.getAttribute('name') || 'unnamed_form';
      const fieldCount = form.querySelectorAll('input, select, textarea').length;

      // ZERO PII: We NEVER access or send input.value

      this.transport.enqueue({
        event_type: 'form_submit',
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        form_id: formId,
        field_count: fieldCount,
        status: 'submitted',
      });
    } catch {
      // Quiet fail
    }
  };

  public destroy(): void {
    if (typeof window !== 'undefined') {
      document.removeEventListener('submit', this.handleFormSubmit, true);
    }
  }
}

import { BeaconTransport } from '../transport/beaconTransport';
import { ResolvedMetricsDashConfig } from '../core/config';

export class TimeMonitor {
  private startTime: number = Date.now();
  private engagedDurationMs: number = 0;
  private lastEngagedTimestamp: number = Date.now();
  private lastActivityTimestamp: number = Date.now();
  private isUserActive: boolean = true;
  private clickCount: number = 0;
  private pageviewCount: number = 1;
  private intervalTimer: number | null = null;

  constructor(
    private readonly config: ResolvedMetricsDashConfig,
    private readonly transport: BeaconTransport
  ) {
    if (!this.config.autoTime || typeof window === 'undefined') return;

    this.bindActivityListeners();
    this.startEngagedTicker();
    this.bindVisibilityListeners();
  }

  public incrementClickCount(): void {
    this.clickCount++;
    this.onUserActivity();
  }

  public incrementPageviewCount(): void {
    this.pageviewCount++;
    this.flushPing();
  }

  public onUserActivity = (): void => {
    const now = Date.now();
    this.lastActivityTimestamp = now;

    if (!this.isUserActive) {
      this.isUserActive = true;
      this.lastEngagedTimestamp = now;
    }
  };

  private startEngagedTicker(): void {
    if (typeof window === 'undefined') return;

    this.intervalTimer = window.setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = (now - this.lastActivityTimestamp) / 1000;

      // Inactivity threshold (e.g., 30 seconds)
      if (timeSinceLastActivity > this.config.inactivityThresholdSeconds) {
        this.isUserActive = false;
      }

      if (this.isUserActive && !document.hidden) {
        this.engagedDurationMs += now - this.lastEngagedTimestamp;
      }
      this.lastEngagedTimestamp = now;
    }, 1000);
  }

  private bindActivityListeners(): void {
    if (typeof window === 'undefined') return;

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, this.onUserActivity, { passive: true });
    });
  }

  private bindVisibilityListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isUserActive = false;
        this.flushPing();
      } else {
        this.onUserActivity();
      }
    });
  }

  public flushPing(): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const totalDurationSeconds = Math.round((now - this.startTime) / 1000);
    const engagedDurationSeconds = Math.round(this.engagedDurationMs / 1000);

    const isBounce =
      this.pageviewCount <= 1 &&
      this.clickCount === 0 &&
      engagedDurationSeconds < this.config.bounceTimeThresholdSeconds;

    this.transport.enqueue({
      event_type: 'session_ping',
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      total_duration_s: totalDurationSeconds,
      engaged_duration_s: engagedDurationSeconds,
      is_bounce: isBounce,
    });
  }

  public destroy(): void {
    if (this.intervalTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.flushPing();
  }
}

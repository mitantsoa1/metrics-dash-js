import { getStorageItem, setStorageItem, getSessionItem, setSessionItem } from '../utils/storage';

export class SessionManager {
  private visitorId: string;
  private sessionId: string;

  constructor() {
    this.visitorId = this.initVisitorId();
    this.sessionId = this.initSessionId();
  }

  public getVisitorId(): string {
    return this.visitorId;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  private initVisitorId(): string {
    let vid = getStorageItem('md_visitor_id');
    if (!vid) {
      vid = 'vis_' + this.generateUuid();
      setStorageItem('md_visitor_id', vid);
    }
    return vid;
  }

  private initSessionId(): string {
    let sid = getSessionItem('md_session_id');
    if (!sid) {
      sid = 'sess_' + this.generateUuid();
      setSessionItem('md_session_id', sid);
    }
    return sid;
  }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

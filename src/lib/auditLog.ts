export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'impersonation_start'
  | 'impersonation_stop'
  | 'login_2fa_sent'
  | 'login_2fa_verified'
  | 'login_2fa_failed'
  | 'login_2fa_expired'
  | 'login_2fa_cancelled';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  user_email: string;
  user_name: string;
  user_id?: string;
  company_context?: string;
  details?: string;
  ip_address?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  user_agent?: string;
}

const AUDIT_LOG_KEY = 'audit-log';
const MAX_ENTRIES = 1000;
const IP_CACHE_KEY = 'cached-ip';
const IP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getAuditLog(): AuditLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getUserAuditLog(userId: string): AuditLogEntry[] {
  return getAuditLog().filter(entry => entry.user_id === userId);
}

export function addAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
  const log = getAuditLog();
  const newEntry: AuditLogEntry = {
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    timestamp: new Date().toISOString(),
  };
  log.unshift(newEntry);

  if (log.length > MAX_ENTRIES) {
    log.length = MAX_ENTRIES;
  }

  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log));
}

// Device detection from user agent
export function getDeviceInfo(): { device_type: 'mobile' | 'desktop' | 'tablet'; user_agent: string } {
  const ua = navigator.userAgent;
  let device_type: 'mobile' | 'desktop' | 'tablet' = 'desktop';

  if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
    device_type = 'tablet';
  } else if (/Mobile|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device_type = 'mobile';
  }

  return { device_type, user_agent: ua };
}

// Cached IP fetch (non-blocking)
let ipCache: { ip: string; fetchedAt: number } | null = null;

export async function fetchIPAddress(): Promise<string> {
  // Check in-memory cache
  if (ipCache && Date.now() - ipCache.fetchedAt < IP_CACHE_TTL) {
    return ipCache.ip;
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(IP_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.fetchedAt < IP_CACHE_TTL) {
        ipCache = parsed;
        return parsed.ip;
      }
    }
  } catch { /* ignore */ }

  // Fetch from API
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    const ip = data.ip || '';
    ipCache = { ip, fetchedAt: Date.now() };
    localStorage.setItem(IP_CACHE_KEY, JSON.stringify(ipCache));
    return ip;
  } catch {
    return '';
  }
}

// Add audit entry with device info and IP (async, non-blocking)
export function addAuditEntryWithDevice(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'ip_address' | 'device_type' | 'user_agent'>): void {
  const { device_type, user_agent } = getDeviceInfo();

  // Add entry immediately with device info
  const entryWithDevice = { ...entry, device_type, user_agent };
  addAuditEntry(entryWithDevice);

  // Async: update with IP when available
  fetchIPAddress().then(ip => {
    if (!ip) return;
    try {
      const log = getAuditLog();
      // Find the most recent entry we just added (by matching fields)
      const idx = log.findIndex(e =>
        e.user_email === entry.user_email &&
        e.action === entry.action &&
        !e.ip_address
      );
      if (idx !== -1) {
        log[idx].ip_address = ip;
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log));
      }
    } catch { /* ignore */ }
  });
}

export function clearAuditLog(): void {
  localStorage.setItem(AUDIT_LOG_KEY, '[]');
}

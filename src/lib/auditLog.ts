export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'login_success' | 'login_failed' | 'logout' | 'impersonation_start' | 'impersonation_stop';
  user_email: string;
  user_name: string;
  user_id?: string;
  company_context?: string;
  details?: string;
}

const AUDIT_LOG_KEY = 'audit-log';
const MAX_ENTRIES = 1000;

export function getAuditLog(): AuditLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
  } catch {
    return [];
  }
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

export function clearAuditLog(): void {
  localStorage.setItem(AUDIT_LOG_KEY, '[]');
}

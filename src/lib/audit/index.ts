/**
 * Audit log helper for Parent Care.
 * Use this in API routes to record all significant actions.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditLogEntry {
  organizationId: string;
  userId: string;
  caredPersonId?: string | null;
  moduleCode?: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  isCritical?: boolean;
  description?: string;
  ipAddress?: string;
  deviceInfo?: string;
  languageUsed?: string;
  approvalRequestId?: string;
}

/**
 * Records an audit log entry. Safe to call — swallows errors gracefully
 * to avoid breaking the main action flow.
 */
export async function recordAudit(entry: AuditLogEntry): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    // Get user display info
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', entry.organizationId)
      .eq('user_id', entry.userId)
      .eq('status', 'active')
      .single();

    const { data: user } = await supabase
      .from('users')
      .select('full_name, email: users(email)')
      .eq('id', entry.userId)
      .single();

    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        organization_id: entry.organizationId,
        user_id: entry.userId,
        cared_person_id: entry.caredPersonId ?? null,
        module_code: entry.moduleCode ?? null,
        action: entry.action,
        table_name: entry.tableName ?? null,
        record_id: entry.recordId ?? null,
        old_data: (entry.oldData as any) ?? null,
        new_data: (entry.newData as any) ?? null,
        is_critical: entry.isCritical ?? false,
        user_role: member?.role ?? null,
        user_display_name: (user as any)?.full_name ?? null,
        ip_address: entry.ipAddress ?? null,
        device_info: entry.deviceInfo ?? null,
        language_used: entry.languageUsed ?? null,
        approval_request_id: entry.approvalRequestId ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[Audit] Failed to record audit log:', error.message);
      return null;
    }

    return log?.id ?? null;
  } catch (err) {
    console.warn('[Audit] Exception recording audit log:', err);
    return null;
  }
}

/**
 * Records a critical audit entry that MUST have approval.
 * Use for: medication changes, permission changes, emergency contact changes.
 */
export async function recordCriticalAudit(entry: AuditLogEntry): Promise<string | null> {
  return recordAudit({ ...entry, isCritical: true });
}

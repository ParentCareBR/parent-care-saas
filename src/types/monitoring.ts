export type MonitoringFieldType =
  | 'boolean'
  | 'checkbox'
  | 'short_text'
  | 'notes'
  | 'number'
  | 'time'
  | 'date'
  | 'single_select'
  | 'multi_select'
  | 'scale_0_10'
  | 'photo'
  | 'attachment';

export interface MonitoringCategory {
  id: string;
  code: string;
  translation_key: string;
  icon: string;
  display_order: number;
  status: 'active' | 'inactive';
  definitions?: MonitoringDefinition[];
}

export interface MonitoringDefinition {
  id: string;
  category_id: string;
  code: string;
  translation_key: string;
  description_translation_key: string;
  field_type: string;
  dependency_code: string | null;
  allows_reminder: boolean;
  allows_attachment: boolean;
  display_order: number;
  status: 'active' | 'inactive';
}

export interface CaredPersonMonitoringSetting {
  id: string;
  organization_id: string;
  cared_person_id: string;
  monitoring_definition_id: string;
  enabled: boolean;
  enabled_at: string;
  disabled_at: string | null;
  configured_by: string | null;
  settings_json: Record<string, any>;
  display_order: number;
  created_at: string;
  updated_at: string;
  definition?: MonitoringDefinition;
}

export interface CustomMonitoringField {
  id: string;
  organization_id: string;
  cared_person_id: string;
  category_id: string | null;
  label: string;
  description: string | null;
  field_type: MonitoringFieldType;
  options_json: string[];
  required: boolean;
  frequency_json: Record<string, any>;
  reminder_settings_json: Record<string, any>;
  visibility_json: Record<string, any>;
  include_daily_summary: boolean;
  include_weekly_report: boolean;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface MonitoringRecord {
  id: string;
  organization_id: string;
  cared_person_id: string;
  monitoring_definition_id: string | null;
  custom_field_id: string | null;
  recorded_by: string | null;
  occurred_at: string;
  value_json: Record<string, any>;
  notes: string | null;
  source: 'family_app' | 'senior_screen' | 'caregiver_app' | 'system_automation';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface MonitoringAuditLog {
  id: string;
  organization_id: string;
  cared_person_id: string;
  action: 'enable' | 'disable' | 'reorder' | 'create_custom_field' | 'archive_custom_field' | 'copy_configuration';
  monitoring_definition_id: string | null;
  custom_field_id: string | null;
  previous_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  performed_by: string | null;
  created_at: string;
}

export interface PatternChangeInsight {
  id: string;
  moduleCode: string;
  categoryCode: string;
  metricLabel: string;
  previousWindowSummary: string;
  currentWindowSummary: string;
  changeDescription: string;
  hasSufficientData: boolean;
  recordCount: number;
  direction: 'increased' | 'decreased' | 'shifted' | 'stable';
  disclaimer: string;
}

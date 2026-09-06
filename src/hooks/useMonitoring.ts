'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { CaredPersonMonitoringSetting, CustomMonitoringField } from '@/types/monitoring';

export function useMonitoring() {
  const { selectedPerson } = useCaredPerson();
  const [settings, setSettings] = useState<CaredPersonMonitoringSetting[]>([]);
  const [customFields, setCustomFields] = useState<CustomMonitoringField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const caredPersonId = selectedPerson?.id || null;

  const fetchSettings = useCallback(async () => {
    if (!caredPersonId) {
      setSettings([]);
      setCustomFields([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch settings
      const res = await fetch(`/api/monitoring/settings?caredPersonId=${caredPersonId}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setSettings(data.settings || []);
      } else {
        setError(data.error || 'Falha ao carregar acompanhamentos');
      }

      // 2. Fetch custom fields
      const cfRes = await fetch(`/api/monitoring/custom-fields?caredPersonId=${caredPersonId}`);
      const cfData = await cfRes.json();
      if (cfRes.ok && cfData.success) {
        setCustomFields(cfData.fields || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar dados de acompanhamento');
    } finally {
      setLoading(false);
    }
  }, [caredPersonId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const enabledCodes = useMemo(() => {
    const set = new Set<string>();
    settings.forEach((s) => {
      const code = s.definition?.code || (s as any).monitoring_definitions?.code;
      if (s.enabled && code) {
        set.add(code);
      }
    });
    return set;
  }, [settings]);

  const isModuleEnabled = useCallback(
    (code: string) => {
      // If no settings saved yet in database for this person, default to true for basic essentials
      if (settings.length === 0) {
        return ['routine_meals', 'routine_hydration', 'meds_scheduled', 'schedule_appointments', 'safety_help_requests', 'checkin_btn_im_well', 'checkin_btn_need_help', 'checkin_btn_took_med', 'checkin_btn_ate', 'checkin_btn_drank_water', 'checkin_btn_emergency'].includes(code);
      }
      return enabledCodes.has(code);
    },
    [enabledCodes, settings.length]
  );

  const saveSettings = useCallback(
    async (codes: string[], payload?: Record<string, any>): Promise<{ success: boolean; error?: string }> => {
      if (!caredPersonId) return { success: false, error: 'Pessoa cuidada não selecionada' };
      try {
        const res = await fetch('/api/monitoring/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caredPersonId,
            enabledCodes: codes,
            settingsPayload: payload || {},
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await fetchSettings();
          return { success: true };
        } else {
          const errMsg = data.error || 'Falha ao salvar configurações.';
          setError(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Erro ao salvar acompanhamentos';
        setError(errMsg);
        return { success: false, error: errMsg };
      }
    },
    [caredPersonId, fetchSettings]
  );

  const copyFrom = useCallback(
    async (sourcePersonId: string): Promise<{ success: boolean; error?: string }> => {
      if (!caredPersonId || !sourcePersonId) return { success: false, error: 'Identificadores inválidos' };
      try {
        const res = await fetch('/api/monitoring/copy-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceCaredPersonId: sourcePersonId,
            targetCaredPersonId: caredPersonId,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await fetchSettings();
          return { success: true };
        } else {
          const errMsg = data.error || 'Falha ao copiar configurações.';
          setError(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Erro ao copiar acompanhamentos';
        setError(errMsg);
        return { success: false, error: errMsg };
      }
    },
    [caredPersonId, fetchSettings]
  );

  return {
    settings,
    customFields,
    enabledCodes,
    isModuleEnabled,
    loading,
    error,
    saveSettings,
    copyFrom,
    refetch: fetchSettings,
  };
}

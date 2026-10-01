export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
  provider?: 'meta' | 'evolution' | 'zapi' | 'none';
}

/**
 * Standardizes a phone number for WhatsApp delivery (defaults to Brazil +55)
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  // Remove non-digit characters
  let clean = phone.replace(/\D/g, '');

  // If Brazilian local number (10 or 11 digits: DDD + Number), prepend country code 55
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }

  // Remove leading 0 if present after 55 (e.g. 55011...)
  if (clean.startsWith('550')) {
    clean = '55' + clean.slice(3);
  }

  return clean;
}

/**
 * Sends a real WhatsApp message to any phone number using the configured provider:
 * 1. Meta WhatsApp Cloud API (Oficial e Gratuito até 1.000 conversas/mês)
 * 2. Evolution API (Open Source gratuito com QR Code em chip próprio)
 * 3. Z-API (Gateway brasileiro)
 */
export async function sendWhatsAppMessage(toPhone: string, text: string): Promise<SendWhatsAppResult> {
  const cleanNumber = formatWhatsAppNumber(toPhone);
  if (!cleanNumber || cleanNumber.length < 10) {
    return { success: false, error: 'Número de telefone inválido para WhatsApp.' };
  }

  // =========================================================================
  // PROVEDOR 1: META WHATSAPP CLOUD API (OFICIAL)
  // =========================================================================
  const metaToken = process.env.WHATSAPP_META_TOKEN || process.env.META_WHATSAPP_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_META_PHONE_ID || process.env.META_PHONE_NUMBER_ID;

  if (metaToken && metaPhoneId) {
    try {
      const endpoint = `https://graph.facebook.com/v20.0/${metaPhoneId}/messages`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanNumber,
          type: 'text',
          text: {
            preview_url: true,
            body: text,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          messageId: data.messages[0].id,
          provider: 'meta',
        };
      } else {
        console.error('[WhatsApp Meta API Error]', data);
        const errMsg = data.error?.message || data.error?.error_user_msg || 'Erro na Meta Cloud API';
        return { success: false, error: errMsg, provider: 'meta' };
      }
    } catch (err: any) {
      console.error('[WhatsApp Meta Network Error]', err);
      return { success: false, error: err.message, provider: 'meta' };
    }
  }

  // =========================================================================
  // PROVEDOR 2: EVOLUTION API (OPEN SOURCE GRATUITO / CHIP PRÓPRIO)
  // =========================================================================
  const evoUrl = process.env.WHATSAPP_API_URL?.replace(/\/$/, '');
  const evoKey = process.env.WHATSAPP_API_KEY;
  const evoInstance = process.env.WHATSAPP_INSTANCE_NAME || 'parentcare';

  if (evoUrl && evoKey) {
    try {
      const endpoint = `${evoUrl}/message/sendText/${evoInstance}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evoKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: text,
          options: {
            delay: 1000,
            presence: 'composing',
            linkPreview: true,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        return {
          success: true,
          messageId: data.key?.id || data.messageId || 'sent',
          provider: 'evolution',
        };
      } else {
        console.error('[WhatsApp Evolution Error]', data);
        return {
          success: false,
          error: data.message || data.error || 'Erro na Evolution API',
          provider: 'evolution',
        };
      }
    } catch (err: any) {
      console.error('[WhatsApp Evolution Network Error]', err);
      return { success: false, error: err.message, provider: 'evolution' };
    }
  }

  // =========================================================================
  // PROVEDOR 3: Z-API (GATEWAY NACIONAL)
  // =========================================================================
  const zapiInstance = process.env.ZAPI_INSTANCE_ID;
  const zapiToken = process.env.ZAPI_TOKEN;

  if (zapiInstance && zapiToken) {
    try {
      const endpoint = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanNumber,
          message: text,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.zaapId || data.messageId)) {
        return {
          success: true,
          messageId: data.zaapId || data.messageId,
          provider: 'zapi',
        };
      } else {
        return { success: false, error: data.error || 'Erro na Z-API', provider: 'zapi' };
      }
    } catch (err: any) {
      return { success: false, error: err.message, provider: 'zapi' };
    }
  }

  // =========================================================================
  // NENHUM PROVEDOR CONFIGURADO
  // =========================================================================
  console.warn('[WhatsApp] Nenhum provedor real de WhatsApp configurado no ambiente.');
  return {
    success: false,
    error: 'WhatsApp real ainda não conectado. Adicione as chaves da Meta Cloud API ou da Evolution API nas variáveis de ambiente.',
    provider: 'none',
  };
}

/**
 * Sends a WhatsApp message to multiple recipients (e.g. emergency alert to all caregivers)
 */
export async function sendWhatsAppBroadcast(phones: string[], text: string): Promise<SendWhatsAppResult[]> {
  const uniquePhones = Array.from(new Set(phones.map(p => formatWhatsAppNumber(p)).filter(Boolean)));
  return Promise.all(uniquePhones.map(phone => sendWhatsAppMessage(phone, text)));
}

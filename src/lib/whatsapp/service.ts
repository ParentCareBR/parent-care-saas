export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
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
 * Sends a WhatsApp message via Evolution API (or compatible open-source WhatsApp Gateway)
 * Zero cost, direct delivery to recipient's normal WhatsApp without any confirmation required.
 */
export async function sendWhatsAppMessage(toPhone: string, text: string): Promise<SendWhatsAppResult> {
  const cleanNumber = formatWhatsAppNumber(toPhone);
  if (!cleanNumber || cleanNumber.length < 10) {
    return { success: false, error: 'Número de telefone inválido.' };
  }

  const apiUrl = process.env.WHATSAPP_API_URL?.replace(/\/$/, '');
  const apiKey = process.env.WHATSAPP_API_KEY;
  const instanceName = process.env.WHATSAPP_INSTANCE_NAME || 'parentcare';

  // If credentials are configured, send real HTTP request to the Evolution API instance
  if (apiUrl && apiKey) {
    try {
      const endpoint = `${apiUrl}/message/sendText/${instanceName}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: text,
          options: {
            delay: 1200,
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
          simulated: false,
        };
      } else {
        console.warn('[WhatsApp] Evolution API error response:', data);
        return {
          success: false,
          error: data.message || data.error || 'Erro na Evolution API',
        };
      }
    } catch (err: any) {
      console.error('[WhatsApp] Network error contacting Evolution API:', err);
      return { success: false, error: err.message };
    }
  }

  // Fallback mode: credentials not yet configured in environment variables
  // Logs dispatch so the system operates cleanly in development and staging
  console.log(`[WhatsApp Simulated Dispatch] To: ${cleanNumber}\nMessage:\n${text}`);
  return {
    success: true,
    simulated: true,
    messageId: 'simulated-' + Date.now(),
  };
}

/**
 * Sends a WhatsApp message to multiple recipients (e.g. emergency alert to all caregivers)
 */
export async function sendWhatsAppBroadcast(phones: string[], text: string): Promise<SendWhatsAppResult[]> {
  const uniquePhones = Array.from(new Set(phones.map(p => formatWhatsAppNumber(p)).filter(Boolean)));
  return Promise.all(uniquePhones.map(phone => sendWhatsAppMessage(phone, text)));
}

import { config } from '../config.js';

const TELEGRAM_API = 'https://api.telegram.org';

export interface CreateInvoiceLinkResult {
  ok: boolean;
  result?: string;
  description?: string;
}

/** Создаёт ссылку на инвойс для оплаты звёздами (XTR). payload — до 128 байт (например jobId). */
export async function createInvoiceLink(
  payload: string,
  starsAmount: number,
  title: string,
  description: string
): Promise<string> {
  if (!config.botToken) throw new Error('TELEGRAM_BOT_TOKEN not set');

  const url = `${TELEGRAM_API}/bot${config.botToken}/createInvoiceLink`;
  const body = {
    title: title.slice(0, 32),
    description: description.slice(0, 255),
    payload: payload.slice(0, 128),
    currency: 'XTR',
    prices: [{ label: title.slice(0, 32) || '1 generation', amount: Math.max(1, Math.floor(starsAmount)) }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as CreateInvoiceLinkResult;
  if (!data.ok || !data.result) {
    throw new Error(data.description ?? 'Failed to create invoice link');
  }
  return data.result;
}

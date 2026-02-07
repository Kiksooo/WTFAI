/** Проверяет, что ошибка от API — исчерпана квота (429) или неверный ключ (401). Тогда не бросаем исключение, а используем fallback. */
export function isQuotaOrAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const msg =
    typeof e.message === 'string'
      ? e.message
      : typeof (e.error as Record<string, unknown>)?.message === 'string'
        ? String((e.error as Record<string, unknown>).message)
        : '';
  const status = e.status ?? (e.statusCode as number);
  const code = e.code ?? (e.error as Record<string, unknown>)?.code;
  if (status === 429 || status === 401) return true;
  if (code === 'insufficient_quota' || code === 'invalid_api_key') return true;
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('401') ||
    lower.includes('quota') ||
    lower.includes('billing') ||
    lower.includes('exceeded') ||
    lower.includes('incorrect api key') ||
    lower.includes('invalid')
  );
}

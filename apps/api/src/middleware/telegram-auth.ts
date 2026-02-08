import { FastifyPluginAsync, FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'crypto';
import { config } from '../config.js';

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    telegramUser?: TelegramUser;
  }
}

function parseInitData(initData: string): Record<string, string> {
  return Object.fromEntries(
    new URLSearchParams(initData).entries()
  ) as Record<string, string>;
}

function validateTelegramWebAppData(initData: string): boolean {
  if (!config.botToken) return false;
  const params = parseInitData(initData);
  const hash = params.hash;
  delete params.hash;
  const dataCheckString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n');
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.botToken)
    .digest();
  const calculated = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  return calculated === hash;
}

async function telegramAuthPlugin(app: FastifyInstance) {
  app.decorateRequest('telegramUser', null);

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawPath = request.url.split('?')[0];
    const path = rawPath.replace(/^https?:\/\/[^/]+/, '') || '/';
    if (path === '/' || path === '/health' || path.startsWith('/static') || path.includes('/webhook/telegram') || path.includes('/admin')) return;
    const initData =
      (request.headers['x-telegram-init-data'] as string) ||
      (request.headers['x-telegram-init-data'.toLowerCase()] as string);
    if (!initData) {
      if (config.devSkipTelegramAuth) {
        request.telegramUser = {
          id: 0,
          first_name: 'Dev',
          username: 'dev',
        };
        return;
      }
      return reply.status(401).send({ error: 'Missing X-Telegram-Init-Data', code: 'missing_init_data' });
    }
    if (!validateTelegramWebAppData(initData)) {
      request.log.info({ msg: 'Telegram initData validation failed — check TELEGRAM_BOT_TOKEN matches the bot whose Menu Button opens this Mini App' });
      return reply.status(401).send({ error: 'Invalid init data', code: 'invalid_init_data' });
    }
    const params = parseInitData(initData);
    const userJson = params.user;
    if (!userJson) {
      return reply.status(401).send({ error: 'No user in init data', code: 'no_user' });
    }
    try {
      const user = JSON.parse(userJson) as TelegramUser;
      request.telegramUser = user;
    } catch {
      return reply.status(401).send({ error: 'Invalid user data', code: 'invalid_user' });
    }
  });
}

export const telegramAuth = fp(telegramAuthPlugin as FastifyPluginAsync);

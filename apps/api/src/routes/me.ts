import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/index.js';
import { config } from '../config.js';
import { generateReferralCode } from '../lib/referral.js';

const REFERRAL_CREDITS_PER_FRIEND = 5;

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { ref?: string } }>('/', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const refCode = request.query.ref?.trim();

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let dbUser = await prisma.user.findUnique({
        where: { id: BigInt(user.id) },
      });

      if (!dbUser) {
        let referralCode = generateReferralCode();
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            dbUser = await prisma.user.create({
              data: {
                id: BigInt(user.id),
                username: user.username ?? null,
                firstName: user.first_name ?? null,
                isPremium: !!user.is_premium,
                dailyGenerationsUsed: 0,
                lastGenerationResetAt: today,
                referralCode,
              },
            });
            break;
          } catch (e: unknown) {
            const isUniqueViolation =
              e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002';
            if (isUniqueViolation && attempt < 2) {
              referralCode = generateReferralCode();
              continue;
            }
            throw e;
          }
        }
      } else {
        if (!dbUser.referralCode) {
          let referralCode = generateReferralCode();
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              dbUser = await prisma.user.update({
                where: { id: BigInt(user.id) },
                data: { referralCode },
              });
              break;
            } catch (e: unknown) {
              const isUniqueViolation =
                e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002';
              if (isUniqueViolation && attempt < 2) {
                referralCode = generateReferralCode();
                continue;
              }
              throw e;
            }
          }
        }
        const lastReset = dbUser.lastGenerationResetAt
          ? new Date(dbUser.lastGenerationResetAt)
          : null;
        const resetDate = lastReset ? new Date(lastReset) : null;
        resetDate?.setHours(0, 0, 0, 0);
        if (!resetDate || resetDate.getTime() < today.getTime()) {
          dbUser = await prisma.user.update({
            where: { id: BigInt(user.id) },
            data: {
              dailyGenerationsUsed: 0,
              lastGenerationResetAt: today,
            },
          });
        }
      }

      if (!dbUser) return reply.status(500).send({ error: 'User not found' });

      if (refCode && !dbUser.referredById) {
        const referrer = await prisma.user.findFirst({
          where: { referralCode: refCode },
        });
        if (referrer && referrer.id !== dbUser!.id) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: BigInt(user.id) },
              data: { referredById: referrer.id },
            }),
            prisma.user.update({
              where: { id: referrer.id },
              data: { referralCredits: referrer.referralCredits + REFERRAL_CREDITS_PER_FRIEND },
            }),
          ]);
          dbUser = await prisma.user.findUniqueOrThrow({ where: { id: BigInt(user.id) } });
        }
      }

      const now = new Date();
      const hasActiveSubscription =
        dbUser!.subscriptionExpiresAt && new Date(dbUser!.subscriptionExpiresAt) > now
        && (dbUser!.subscriptionPlan === 'basic' || dbUser!.subscriptionPlan === 'vip');

      const dailyLimit = dbUser!.isPremium ? config.dailyLimitPremium : config.dailyLimitFree;
      const monthlyLimit = hasActiveSubscription
        ? (dbUser!.subscriptionPlan === 'vip' ? config.vipMonthlyVideos : config.basicMonthlyVideos)
        : null;

      return reply.send({
        id: String(dbUser!.id),
        firstName: dbUser!.firstName ?? null,
        username: dbUser!.username ?? null,
        isPremium: dbUser!.isPremium,
        dailyGenerationsUsed: dbUser!.dailyGenerationsUsed,
        dailyLimit,
        starsPerGeneration: config.paymentStarsPerGeneration,
        subscriptionPlan: dbUser!.subscriptionPlan,
        subscriptionExpiresAt: dbUser!.subscriptionExpiresAt?.toISOString() ?? null,
        monthlyGenerationsUsed: dbUser!.monthlyGenerationsUsed,
        monthlyLimit,
        subscriptionPlans: {
          basic: { monthlyVideos: config.basicMonthlyVideos, priceStars: config.basicPriceStars },
          vip: { monthlyVideos: config.vipMonthlyVideos, priceStars: config.vipPriceStars },
        },
        referralCode: dbUser!.referralCode ?? null,
        referralCredits: dbUser!.referralCredits,
        starsReceived: dbUser!.starsReceived,
      });
    } catch (err: unknown) {
      request.log.error(err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Database error';
      return reply.status(500).send({
        error: msg.includes('table') || msg.includes('P2021')
          ? 'Таблицы не созданы. Проверь, что DATABASE_URL задан и сервис перезапущен.'
          : msg,
      });
    }
  });
};

import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const auditService = {
  /**
   * Log an admin action to the AuditLog table
   */
  async logAction(
    actorId: string | null | undefined,
    action: string,
    targetId?: string,
    targetType?: string,
    details?: any
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: actorId || null,
          action,
          targetId,
          targetType,
          details,
        },
      });
    } catch (error) {
      // Denetim izi yazarken oluşan hatalar uygulamanın akışını durdurmamalı, sadece loglanmalı
      logger.error('AuditLog yazılamadı:', { error, action, actorId });
    }
  },
};

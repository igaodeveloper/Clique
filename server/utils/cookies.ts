import { Response } from 'express';

/**
 * Utilitários para gerenciamento de cookies
 */
export const cookies = {
  /**
   * Define configurações para cookies de sessão
   */
  getSessionOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
      path: '/'
    };
  },

  /**
   * Limpa o cookie de sessão
   */
  clearSession(res: Response) {
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    });
  }
};
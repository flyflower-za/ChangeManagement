import { cookies } from 'next/headers'
import { getIronSession, type SessionOptions } from 'iron-session'
import { prisma } from '@/lib/db'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || 'change-management-mvp-session-secret-at-least-32-chars-long!!',
  cookieName: 'cm_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h
  },
}

export async function getAppSession() {
  return getIronSession<SessionUser & { _init?: boolean }>(await cookies(), sessionOptions)
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  // MVP: 返回真实的admin用户（从数据库获取）
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@company.com' },
    select: { id: true, name: true, email: true, role: true }
  })

  if (admin) {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    }
  }

  // Fallback: 如果数据库中没有admin用户，返回null
  return null
}

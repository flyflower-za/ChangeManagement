import { cookies } from 'next/headers'
import { getIronSession, type SessionOptions } from 'iron-session'

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
  // MVP: 无需认证，返回默认用户
  // 如果需要真实的 session 检查，取消下面的注释
  // const session = await getAppSession()
  // if (session.id && session.name) {
  //   return {
  //     id: session.id,
  //     name: session.name,
  //     email: session.email,
  //     role: session.role,
  //   }
  // }
  // return null

  // MVP: 返回默认管理员用户
  return {
    id: 'mvp-admin',
    name: 'MVP 管理员',
    email: 'mvp@example.com',
    role: 'admin',
  }
}

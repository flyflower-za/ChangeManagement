import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const config = await prisma.aiConfig.findFirst({
    select: { id: true, baseUrl: true, model: true, enabled: true }
  })
  return NextResponse.json(config || { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', enabled: false })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { apiKey, baseUrl, model, enabled } = body
  const existing = await prisma.aiConfig.findFirst()

  if (existing) {
    await prisma.aiConfig.update({
      where: { id: existing.id },
      data: { apiKey: apiKey || existing.apiKey, baseUrl, model, enabled },
    })
  } else {
    await prisma.aiConfig.create({
      data: { apiKey: apiKey || '', baseUrl, model, enabled },
    })
  }
  return NextResponse.json({ ok: true })
}

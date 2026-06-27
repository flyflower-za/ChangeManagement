import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json([])

  // 获取分配给当前用户的待执行Checklist项
  const tasks = await prisma.checklistItem.findMany({
    where: {
      executorId: user.id,
      status: { in: ['PENDING', 'REJECTED'] },
    },
    include: {
      changeModule: {
        include: {
          module: {
            select: { name: true }
          },
          changeProject: {
            select: {
              id: true,
              title: true,
              priority: true,
              plannedStart: true,
            }
          }
        }
      }
    },
    orderBy: [
      { changeModule: { changeProject: { priority: 'desc' } } },
      { sortOrder: 'asc' },
    ],
  })

  return NextResponse.json(tasks)
}

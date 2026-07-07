import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json([])

  // 获取当前用户作为审批人的变更项目
  const changes = await prisma.changeProject.findMany({
    where: {
      status: { in: ['EXECUTING', 'APPROVING'] },
      modules: {
        some: {
          approverId: user.id,
          status: { in: ['EXECUTING', 'REVIEWING'] },
        },
      },
    },
    include: {
      modules: {
        where: {
          approverId: user.id,
        },
        include: {
          module: {
            select: { name: true }
          },
          items: {
            select: {
              id: true,
              status: true
            }
          }
        }
      }
    },
    orderBy: {
      priority: 'desc',
    },
  })

  // 格式化返回数据
  const result = changes.map(change => {
    const modules = change.modules.map(m => ({
      id: m.id,
      moduleName: m.module.name,
      status: m.status,
      itemCount: m.items.length,
      doneCount: m.items.filter(i => i.status === 'DONE').length,
    }))

    return {
      id: change.id,
      title: change.title,
      priority: change.priority,
      plannedStart: change.plannedStart,
      modules,
    }
  })

  return NextResponse.json(result)
}

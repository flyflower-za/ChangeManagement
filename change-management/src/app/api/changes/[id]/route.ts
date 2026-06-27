import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const change = await prisma.changeProject.findUnique({
    where: { id },
    include: {
      initiator: true,
      modules: {
        include: {
          module: true,
          approver: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })

  if (!change) return NextResponse.json({ error: '不存在' }, { status: 404 })
  return NextResponse.json(change)
}

// Execute / update checklist item
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { action } = body

  if (action === 'execute_item') {
    const item = await prisma.checklistItem.update({
      where: { id: body.itemId },
      data: {
        status: 'DONE',
        executedAt: new Date(),
        evidenceNotes: body.evidenceNotes || '',
        executorId: user.id,
      },
    })

    // Check if all items in the module are done
    const changeModule = await prisma.changeModule.findUnique({
      where: { id: item.changeModuleId },
      include: { items: true },
    })
    if (changeModule && changeModule.items.every(i => i.status === 'DONE')) {
      await prisma.changeModule.update({
        where: { id: changeModule.id },
        data: { status: 'REVIEWING' },
      })
      // Check if all modules are in reviewing
      const change = await prisma.changeProject.findUnique({
        where: { id },
        include: { modules: true },
      })
      if (change && change.modules.every(m => m.status === 'REVIEWING' || m.status === 'APPROVED')) {
        await prisma.changeProject.update({
          where: { id },
          data: { status: 'APPROVING' },
        })
      }
    }
    return NextResponse.json(item)
  }

  if (action === 'approve_module') {
    const changeModule = await prisma.changeModule.update({
      where: { id: body.changeModuleId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approverId: user.id,
      },
    })

    // Check if all modules approved
    const change = await prisma.changeProject.findUnique({
      where: { id },
      include: { modules: true },
    })
    if (change && change.modules.every(m => m.status === 'APPROVED')) {
      await prisma.changeProject.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    }
    return NextResponse.json(changeModule)
  }

  if (action === 'reject_module') {
    const { changeModuleId, rejectReason, rejectItemIds } = body

    if (rejectItemIds && rejectItemIds.length > 0) {
      // Reject specific items
      for (const itemId of rejectItemIds) {
        await prisma.checklistItem.update({
          where: { id: itemId },
          data: { status: 'REJECTED', rejectReason },
        })
      }
      await prisma.changeModule.update({
        where: { id: changeModuleId },
        data: { status: 'EXECUTING', rejectReason },
      })
    } else {
      // Reject all
      await prisma.checklistItem.updateMany({
        where: { changeModuleId },
        data: { status: 'REJECTED' },
      })
      await prisma.changeModule.update({
        where: { id: changeModuleId },
        data: { status: 'EXECUTING', rejectReason },
      })
    }

    // Change project back to executing
    await prisma.changeProject.update({
      where: { id },
      data: { status: 'EXECUTING' },
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'assign_executor') {
    const item = await prisma.checklistItem.update({
      where: { id: body.itemId },
      data: { executorId: body.executorId },
    })
    return NextResponse.json(item)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

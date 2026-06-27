import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create users
  const adminPass = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: { name: '系统管理员', email: 'admin@company.com', password: adminPass, role: 'admin' }
  })

  const mgrPass = await bcrypt.hash('mgr123', 10)
  const dbManager = await prisma.user.upsert({
    where: { email: 'dbmanager@company.com' },
    update: {},
    create: { name: '张三', email: 'dbmanager@company.com', password: mgrPass, role: 'executor' }
  })

  const executor = await prisma.user.upsert({
    where: { email: 'executor@company.com' },
    update: {},
    create: { name: '李四', email: 'executor@company.com', password: mgrPass, role: 'executor' }
  })

  const approver = await prisma.user.upsert({
    where: { email: 'approver@company.com' },
    update: {},
    create: { name: '王五', email: 'approver@company.com', password: mgrPass, role: 'approver' }
  })

  // Create modules
  const dbModule = await prisma.module.upsert({
    where: { id: 'module-db' },
    update: {},
    create: {
      id: 'module-db',
      name: '数据库',
      description: '数据库运维团队',
      managerId: approver.id,
    }
  })

  const netModule = await prisma.module.upsert({
    where: { id: 'module-net' },
    update: {},
    create: {
      id: 'module-net',
      name: '网络',
      description: '网络运维团队',
      managerId: approver.id,
    }
  })

  const secModule = await prisma.module.upsert({
    where: { id: 'module-sec' },
    update: {},
    create: {
      id: 'module-sec',
      name: '安全',
      description: '安全管理团队',
      managerId: approver.id,
    }
  })

  // Create checklist templates
  const dbTemplate = await prisma.checklistTemplate.upsert({
    where: { id: 'tpl-db-1' },
    update: {},
    create: {
      id: 'tpl-db-1',
      moduleId: dbModule.id,
      name: '数据库变更 Checklist',
      description: '数据库变更通用检查项',
      createdBy: dbManager.id,
    }
  })

  const items = [
    { title: '备份当前数据库', description: '执行前完整备份，验证可恢复', evidenceType: 'log', isRequired: true, defaultExecutorId: executor.id, sortOrder: 1 },
    { title: '通知业务方', description: '提前通知受影响业务线', evidenceType: 'text', isRequired: true, defaultExecutorId: executor.id, sortOrder: 2 },
    { title: '停止从库同步', description: '停止所有从库的复制同步', evidenceType: 'log', isRequired: true, defaultExecutorId: executor.id, sortOrder: 3 },
    { title: '执行主从切换', description: '执行数据库主从切换操作', evidenceType: 'screenshot', isRequired: true, defaultExecutorId: executor.id, sortOrder: 4 },
    { title: '验证同步状态', description: '验证新主库写入和从库同步正常', evidenceType: 'screenshot', isRequired: true, defaultExecutorId: executor.id, sortOrder: 5 },
  ]

  for (const item of items) {
    await prisma.checklistItemDef.upsert({
      where: { id: `def-${dbTemplate.id}-${item.sortOrder}` },
      update: {},
      create: {
        id: `def-${dbTemplate.id}-${item.sortOrder}`,
        templateId: dbTemplate.id,
        ...item,
      }
    })
  }

  // Network template
  const netTemplate = await prisma.checklistTemplate.upsert({
    where: { id: 'tpl-net-1' },
    update: {},
    create: {
      id: 'tpl-net-1',
      moduleId: netModule.id,
      name: '网络变更 Checklist',
      description: '网络配置变更检查项',
      createdBy: dbManager.id,
    }
  })

  const netItems = [
    { title: '备份当前网络配置', description: '导出当前交换机/路由器配置', evidenceType: 'config', isRequired: true, defaultExecutorId: executor.id, sortOrder: 1 },
    { title: '验证网络连通性', description: '变更前测试当前网络连通性基线', evidenceType: 'log', isRequired: true, defaultExecutorId: executor.id, sortOrder: 2 },
    { title: '执行网络变更', description: '按变更计划修改网络配置', evidenceType: 'screenshot', isRequired: true, defaultExecutorId: executor.id, sortOrder: 3 },
    { title: '变更后连通性验证', description: '验证变更后网络正常', evidenceType: 'log', isRequired: true, defaultExecutorId: executor.id, sortOrder: 4 },
  ]

  for (const item of netItems) {
    await prisma.checklistItemDef.upsert({
      where: { id: `def-${netTemplate.id}-${item.sortOrder}` },
      update: {},
      create: {
        id: `def-${netTemplate.id}-${item.sortOrder}`,
        templateId: netTemplate.id,
        ...item,
      }
    })
  }

  // Create a sample change project
  const sampleChange = await prisma.changeProject.upsert({
    where: { id: 'change-sample-1' },
    update: {},
    create: {
      id: 'change-sample-1',
      title: '数据库主从切换演练',
      description: '生产环境数据库主从切换，验证高可用方案',
      priority: 'high',
      status: 'EXECUTING',
      plannedStart: new Date('2026-06-28T02:00:00'),
      plannedEnd: new Date('2026-06-28T04:00:00'),
      createdById: admin.id,
    }
  })

  // Add DB module to the change
  const changeDbModule = await prisma.changeModule.create({
    data: {
      changeProjectId: sampleChange.id,
      moduleId: dbModule.id,
      approverId: approver.id,
      status: 'EXECUTING',
    }
  })

  // Copy checklist items from template
  const dbDefs = await prisma.checklistItemDef.findMany({
    where: { templateId: dbTemplate.id },
    orderBy: { sortOrder: 'asc' }
  })

  for (const def of dbDefs) {
    await prisma.checklistItem.create({
      data: {
        changeModuleId: changeDbModule.id,
        title: def.title,
        description: def.description,
        expectedResult: def.expectedResult,
        evidenceType: def.evidenceType,
        isRequired: def.isRequired,
        executorId: def.defaultExecutorId,
        sortOrder: def.sortOrder,
        status: def.sortOrder <= 2 ? 'DONE' : 'PENDING',
        executedAt: def.sortOrder <= 2 ? new Date() : null,
        evidenceNotes: def.sortOrder <= 2 ? '已完成执行，结果正常' : null,
      }
    })
  }

  console.log('Seed completed!')
  console.log('Users: admin@company.com/admin123, dbmanager@company.com/mgr123, executor@company.com/mgr123, approver@company.com/mgr123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

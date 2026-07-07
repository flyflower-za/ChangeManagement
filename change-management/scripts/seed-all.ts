import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 开始构建完整测试数据...\n')
  const pw = await bcrypt.hash('123456', 10)

  // ========== 用户 ==========
  console.log('1. 创建用户...')
  const admin = await prisma.user.create({ data: { name: '系统管理员', email: 'admin@company.com', password: pw, role: 'admin' } })
  const zhangsan = await prisma.user.create({ data: { name: '张三', email: 'zhangsan@company.com', password: pw, role: 'approver' } })
  const lisi = await prisma.user.create({ data: { name: '李四', email: 'lisi@company.com', password: pw, role: 'executor' } })
  const wangwu = await prisma.user.create({ data: { name: '王五', email: 'wangwu@company.com', password: pw, role: 'approver' } })
  const zhaoliu = await prisma.user.create({ data: { name: '赵六', email: 'zhaoliu@company.com', password: pw, role: 'executor' } })
  console.log('   ✓ 5个用户\n')

  // ========== 工厂 ==========
  console.log('2. 创建工厂...')
  const factoryA = await prisma.factory.create({ data: { name: '工厂A', description: '主生产基地' } })
  console.log('   ✓ 工厂A\n')

  // ========== 部门/车间 (平级Module) ==========
  console.log('3. 创建部门/车间...')
  const deptDevice   = await prisma.module.create({ data: { factoryId: factoryA.id, name: '设备部门', description: '设备运维管理', managerId: wangwu.id } })
  const deptProcess  = await prisma.module.create({ data: { factoryId: factoryA.id, name: '工艺部门', description: '工艺参数与流程', managerId: wangwu.id } })
  const deptQuality  = await prisma.module.create({ data: { factoryId: factoryA.id, name: '质量部门', description: '质量检验与管控', managerId: wangwu.id } })
  const deptLogistics = await prisma.module.create({ data: { factoryId: factoryA.id, name: '物流部门', description: '物流与仓储管理', managerId: wangwu.id } })
  const workshop1     = await prisma.module.create({ data: { factoryId: factoryA.id, name: '生产1', description: '一号车间', managerId: zhangsan.id } })
  const workshop2     = await prisma.module.create({ data: { factoryId: factoryA.id, name: '生产2', description: '二号车间', managerId: zhangsan.id } })
  const allModules = [deptDevice, deptProcess, deptQuality, deptLogistics, workshop1, workshop2]
  console.log('   ✓ 4部门 + 2车间\n')

  // ========== 部门联系人 ==========
  console.log('4. 创建部门联系人...')
  await prisma.departmentContact.create({ data: { moduleId: deptDevice.id, title: '部门经理', name: '陈工', sortOrder: 1 } })
  await prisma.departmentContact.create({ data: { moduleId: deptDevice.id, title: '备件管理', name: '小刘', sortOrder: 2 } })
  await prisma.departmentContact.create({ data: { moduleId: deptProcess.id, title: '部门经理', name: '赵工', sortOrder: 1 } })
  await prisma.departmentContact.create({ data: { moduleId: deptProcess.id, title: '工艺工程师', name: '小孙', sortOrder: 2 } })
  await prisma.departmentContact.create({ data: { moduleId: deptQuality.id, title: '部门经理', name: '钱工', sortOrder: 1 } })
  await prisma.departmentContact.create({ data: { moduleId: deptQuality.id, title: '质量工程师', name: '小李', sortOrder: 2 } })
  await prisma.departmentContact.create({ data: { moduleId: deptLogistics.id, title: '部门经理', name: '孙工', sortOrder: 1 } })
  console.log('   ✓ 部门联系人\n')

  // ========== 产品 ==========
  console.log('5. 创建产品...')
  const productA = await prisma.product.create({ data: { name: '产品A', code: 'PROD-A', description: '主力产品线', sortOrder: 1 } })
  const productB = await prisma.product.create({ data: { name: '产品B', code: 'PROD-B', description: '高附加值产品线', sortOrder: 2 } })
  console.log('   ✓ 产品A, 产品B\n')

  // ========== 产品-部门-负责人 ==========
  console.log('6. 创建产品跨部门负责人...')
  const assignments = [
    { productId: productA.id, moduleId: deptDevice.id, person: '陈工' },
    { productId: productA.id, moduleId: deptProcess.id, person: '张三' },
    { productId: productA.id, moduleId: deptQuality.id, person: '李四' },
    { productId: productA.id, moduleId: deptLogistics.id, person: '孙工' },
    { productId: productA.id, moduleId: workshop1.id, person: '杨班长' },
    { productId: productA.id, moduleId: workshop2.id, person: '赵六' },
    { productId: productB.id, moduleId: deptDevice.id, person: '小刘' },
    { productId: productB.id, moduleId: deptProcess.id, person: '小孙' },
    { productId: productB.id, moduleId: deptQuality.id, person: '小王' },
    { productId: productB.id, moduleId: deptLogistics.id, person: '小马' },
    { productId: productB.id, moduleId: workshop1.id, person: '刘班长' },
    { productId: productB.id, moduleId: workshop2.id, person: '黄班长' },
  ]
  for (const a of assignments) {
    await prisma.productAssignment.create({ data: a })
  }
  console.log('   ✓ 12个产品-部门负责人\n')

  // ========== 产线 ==========
  console.log('7. 创建产线...')
  await prisma.productionLine.create({ data: { name: '产线1', code: 'L1', moduleId: workshop1.id, productId: productA.id, sortOrder: 1 } })
  await prisma.productionLine.create({ data: { name: '产线2', code: 'L2', moduleId: workshop1.id, productId: productB.id, sortOrder: 2 } })
  await prisma.productionLine.create({ data: { name: '产线3', code: 'L3', moduleId: workshop1.id, productId: productA.id, sortOrder: 3 } })
  await prisma.productionLine.create({ data: { name: '产线4', code: 'L4', moduleId: workshop2.id, productId: productA.id, sortOrder: 4 } })
  await prisma.productionLine.create({ data: { name: '产线5', code: 'L5', moduleId: workshop2.id, productId: productB.id, sortOrder: 5 } })
  console.log('   ✓ 5条产线\n')

  // ========== 模版 ==========
  console.log('8. 创建检查模版...')
  const checklistData: Record<string, string[]> = {
    '设备部门': ['设备运行状态检查', '备件库存核查', '安全防护验证', '操作规程确认', '停机通知发布'],
    '工艺部门': ['工艺参数备份', '变更方案评审', '试运行验证', '工艺文件更新', 'SOP修订确认'],
    '质量部门': ['质量标准确认', '检验方法更新', '样品测试', '不合格品处置', '质量记录归档'],
    '物流部门': ['物流方案评估', '仓储容量检查', '供应商通知', '应急方案准备'],
    '生产1': ['人员安排确认', '物料准备检查', '设备联动测试', '首件检验', '产能验证'],
    '生产2': ['人员安排确认', '物料准备检查', '设备联动测试', '首件检验', '产能验证'],
  }
  for (const m of allModules) {
    const items = checklistData[m.name] || ['常规检查项1', '常规检查项2', '常规检查项3']
    const tpl = await prisma.checklistTemplate.create({
      data: { moduleId: m.id, name: `${m.name}变更检查清单`, description: '', createdBy: admin.id }
    })
    for (let i = 0; i < items.length; i++) {
      await prisma.checklistItemDef.create({
        data: { templateId: tpl.id, title: items[i], description: '', evidenceType: 'text', isRequired: true, sortOrder: i + 1 }
      })
    }
    console.log(`   ✓ ${m.name}: ${items.length}项`)
  }

  // ========== 测试变更项目 ==========
  console.log('\n9. 创建测试变更项目...')
  const change1 = await createChange('产品A产线升级改造', '对产品A相关产线进行升级', 'high', admin.id, [productA.id], allModules, lisi.id, 1)
  console.log(`   ✓ ${change1.title}`)
  const change2 = await createChange('产品B质量优化项目', '优化产品B的生产质量流程', 'medium', admin.id, [productB.id], allModules, lisi.id, 2)
  console.log(`   ✓ ${change2.title}`)

  console.log('\n✅ 全部测试数据创建完成！')
  console.log(`\n📊 统计:`)
  const stats = {
    factories: await prisma.factory.count(),
    departments: await prisma.module.count(),
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    assignments: await prisma.productAssignment.count(),
    productionLines: await prisma.productionLine.count(),
    templates: await prisma.checklistTemplate.count(),
    items: await prisma.checklistItemDef.count(),
    changes: await prisma.changeProject.count(),
  }
  console.log(`  工厂: ${stats.factories}  部门/车间: ${stats.departments}  用户: ${stats.users}`)
  console.log(`  产品: ${stats.products}  负责人: ${stats.assignments}  产线: ${stats.productionLines}`)
  console.log(`  模版: ${stats.templates}  检查项: ${stats.items}  变更项目: ${stats.changes}`)
}

async function createChange(title: string, desc: string, priority: string, creatorId: string, productIds: string[], allModules: any[], executorId: string, serial: number) {
  const assignments = await prisma.productAssignment.findMany({
    where: { productId: { in: productIds } },
    select: { moduleId: true }
  })
  const involvedIds = [...new Set(assignments.map(a => a.moduleId))]

  const change = await prisma.changeProject.create({
    data: { title, description: desc, priority, status: 'EXECUTING', plannedStart: new Date(Date.now() + 86400000), plannedEnd: new Date(Date.now() + 3 * 86400000), createdById: creatorId, serial }
  })

  for (const mid of involvedIds) {
    const m = allModules.find((x: any) => x.id === mid)
    if (!m) continue
    const tpl = await prisma.checklistTemplate.findFirst({ where: { moduleId: mid }, include: { items: true } })
    if (!tpl) continue

    const cm = await prisma.changeModule.create({
      data: { changeProjectId: change.id, moduleId: mid, approverId: m.managerId, status: 'EXECUTING' }
    })
    for (const def of tpl.items) {
      await prisma.checklistItem.create({
        data: { changeModuleId: cm.id, title: def.title, description: def.description, evidenceType: def.evidenceType, isRequired: def.isRequired, sortOrder: def.sortOrder, executorId }
      })
    }
  }
  return change
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

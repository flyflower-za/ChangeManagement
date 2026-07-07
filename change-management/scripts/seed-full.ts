import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 构建完整测试数据...\n')
  const pw = await bcrypt.hash('123456', 10)

  // ====== 1. 用户 ======
  console.log('1. 用户')
  const users = {
    admin:   await prisma.user.create({ data: { username:'admin', name:'系统管理员', email:'admin@company.com', password:pw, role:'admin' } }),
    zhangsan: await prisma.user.create({ data: { username:'zhangsan', name:'张三', email:'zhangsan@company.com', password:pw, role:'approver' } }),
    lisi:    await prisma.user.create({ data: { username:'lisi',    name:'李四', email:'lisi@company.com',    password:pw, role:'executor' } }),
    wangwu:  await prisma.user.create({ data: { username:'wangwu',  name:'王五', email:'wangwu@company.com',  password:pw, role:'approver' } }),
    zhaoliu: await prisma.user.create({ data: { username:'zhaoliu', name:'赵六', email:'zhaoliu@company.com', password:pw, role:'executor' } }),
    sunqi:   await prisma.user.create({ data: { username:'sunqi',   name:'孙七', email:'sunqi@company.com',   password:pw, role:'executor' } }),
    zhouba:  await prisma.user.create({ data: { username:'zhouba',  name:'周八', email:'zhouba@company.com',  password:pw, role:'executor' } }),
  }
  console.log('   ✓ 7个用户')

  // ====== 2. 工厂 ======
  console.log('2. 工厂')
  await prisma.factory.create({ data: { id:'factory-a', name:'工厂A', description:'主生产基地' } })
  console.log('   ✓ 工厂A')

  // ====== 3. 部门 (固定ID方便后续引用) ======
  console.log('3. 部门')
  const depts = {
    device:   await prisma.module.create({ data: { id:'dept-device',   factoryId:'factory-a', name:'设备部门', description:'设备运维管理',        managerId:users.wangwu.id } }),
    process:  await prisma.module.create({ data: { id:'dept-process',  factoryId:'factory-a', name:'工艺部门', description:'工艺参数与流程管理',    managerId:users.zhangsan.id } }),
    quality:  await prisma.module.create({ data: { id:'dept-quality',  factoryId:'factory-a', name:'质量部门', description:'质量检验与管控',        managerId:users.wangwu.id } }),
    logistics:await prisma.module.create({ data: { id:'dept-logistics',factoryId:'factory-a', name:'物流部门', description:'物流与仓储管理',        managerId:users.wangwu.id } }),
    workshop1:await prisma.module.create({ data: { id:'dept-ws1',      factoryId:'factory-a', name:'生产1',   description:'一号车间',              managerId:users.zhangsan.id } }),
    workshop2:await prisma.module.create({ data: { id:'dept-ws2',      factoryId:'factory-a', name:'生产2',   description:'二号车间',              managerId:users.zhangsan.id } }),
  }
  const allDepts = Object.values(depts)
  // 分配用户到部门
  await prisma.user.update({ where:{id:users.zhangsan.id}, data:{departmentId:'dept-process'} })
  await prisma.user.update({ where:{id:users.lisi.id},    data:{departmentId:'dept-quality'} })
  await prisma.user.update({ where:{id:users.wangwu.id},  data:{departmentId:'dept-device'} })
  await prisma.user.update({ where:{id:users.zhaoliu.id}, data:{departmentId:'dept-ws1'} })
  console.log('   ✓ 6个部门')

  // ====== 4. 产品 + 跨部门负责人 ======
  console.log('4. 产品')
  const productA = await prisma.product.create({ data: { name:'产品A', code:'PROD-A', description:'主力车型', sortOrder:1 } })
  const productB = await prisma.product.create({ data: { name:'产品B', code:'PROD-B', description:'高端车型', sortOrder:2 } })
  // 产品A负责人
  for (const [deptId, person] of [
    [depts.device.id,'陈工'],[depts.process.id,'张三'],[depts.quality.id,'李四'],
    [depts.logistics.id,'孙工'],[depts.workshop1.id,'杨班长'],[depts.workshop2.id,'赵六']
  ]) { await prisma.productAssignment.create({ data:{ productId:productA.id, moduleId:deptId, person } }) }
  // 产品B负责人
  for (const [deptId, person] of [
    [depts.device.id,'小刘'],[depts.process.id,'小孙'],[depts.quality.id,'小王'],
    [depts.logistics.id,'小马'],[depts.workshop1.id,'刘班长'],[depts.workshop2.id,'黄班长']
  ]) { await prisma.productAssignment.create({ data:{ productId:productB.id, moduleId:deptId, person } }) }
  console.log('   ✓ 产品A + 产品B，共12个部门负责人')

  // ====== 5. 检查模版 ======
  console.log('5. 检查模版')
  const templateItems: Record<string, string[]> = {
    'dept-device':   ['设备运行状态检查','备件库存核查','安全防护装置验证','操作规程确认','停机通知发布','应急预案确认','变更后功能测试','运行参数基线记录'],
    'dept-process':  ['工艺参数备份','变更方案评审','影响范围评估','试运行验证','产品质量检测','工艺文件更新','SOP修订确认','操作人员培训'],
    'dept-quality':  ['质量标准符合性确认','检验方法更新','检测设备校准','样品留样','全项测试','不合格品处置预案','质量记录归档','客诉风险评估'],
    'dept-logistics':['物流方案评估','运输路线确认','仓储容量检查','信息系统更新','供应商通知','应急方案准备','成本核算'],
    'dept-ws1':      ['生产计划调整','人员安排确认','物料准备检查','设备联动测试','生产节拍验证','首件检验','异常预案确认','产能验证'],
    'dept-ws2':      ['生产计划调整','人员安排确认','物料准备检查','设备联动测试','生产节拍验证','首件检验','清洁验证','交接班安排'],
  }
  for (const d of allDepts) {
    const items = templateItems[d.id] || ['常规检查1','常规检查2','常规检查3']
    const tpl = await prisma.checklistTemplate.create({ data:{ moduleId:d.id, name:`${d.name}变更检查清单`, createdBy:users.admin.id } })
    for (let i=0;i<items.length;i++) {
      await prisma.checklistItemDef.create({ data:{ templateId:tpl.id, title:items[i], evidenceType:'text', isRequired:true, sortOrder:i+1 } })
    }
  }
  console.log('   ✓ 6个模版')

  // ====== 6. 变更案例 (5个不同进度) ======
  console.log('6. 创建变更案例...')

  // 案例1: 刚刚创建 (DRAFT)
  const c1 = await createProject('设备例行检修', '季度设备检修维护', 'medium', users.lisi.id, [depts.device.id], 'DRAFT', 0, null)
  console.log('   ✓ 1/5 刚刚创建 - 设备例行检修 (草稿)')

  // 案例2: 部分完成 ~30% (EXECUTING) - 产品A
  const c2 = await createProject('物流系统升级', 'WMS系统版本升级', 'high', users.lisi.id, [depts.logistics.id, depts.device.id], 'EXECUTING', 0.3, productA.id)
  console.log('   ✓ 2/5 部分完成 - 物流系统升级 (执行中~30%) - 产品A')

  // 案例3: 部分完成 ~60% (EXECUTING) - 产品A
  const c3 = await createProject('工艺参数优化', '焊接工艺参数优化调整', 'high', users.zhaoliu.id, [depts.process.id, depts.quality.id, depts.workshop1.id], 'EXECUTING', 0.6, productA.id)
  console.log('   ✓ 3/5 部分完成 - 工艺参数优化 (执行中~60%) - 产品A')

  // 案例4: 待审批 (APPROVING) - 产品A
  const c4 = await createProject('产品A产线改造', '产品A装配线自动化改造', 'critical', users.lisi.id, [depts.workshop1.id, depts.device.id, depts.process.id, depts.quality.id], 'APPROVING', 1.0, productA.id)
  console.log('   ✓ 4/5 待审批 - 产品A产线改造 (待审批)')

  // 案例5: 待审批 (APPROVING) - 产品B
  const c5 = await createProject('涂装线环保升级', '涂装废气处理系统升级', 'high', users.zhaoliu.id, [depts.workshop2.id, depts.device.id, depts.quality.id], 'APPROVING', 1.0, productB.id)
  console.log('   ✓ 5/5 待审批 - 涂装线环保升级 (待审批) - 产品B')

  // 案例6: 已完成 (COMPLETED) - 产品A
  const c6 = await createProject('来料检验流程优化', '来料检验流程标准化', 'medium', users.lisi.id, [depts.quality.id, depts.logistics.id], 'COMPLETED', 1.0, productA.id)
  console.log('   ✓ 6/6 已完成 - 来料检验流程优化 (已完成) - 产品A')

  // 案例7: 部分完成 ~80% (EXECUTING) - 产品B
  const c7 = await createProject('产品B质量控制', '产品B关键尺寸管控升级', 'critical', users.zhaoliu.id, [depts.quality.id, depts.process.id, depts.workshop2.id], 'EXECUTING', 0.8, productB.id)
  console.log('   ✓ 7/7 部分完成 - 产品B质量控制 (执行中~80%) - 产品B')

  // 案例8: 刚刚开始 ~10% (EXECUTING)
  const c8 = await createProject('仓库布局调整', '原材料仓库重新布局', 'low', users.lisi.id, [depts.logistics.id], 'EXECUTING', 0.1, null)
  console.log('   ✓ 8/8 刚刚开始 - 仓库布局调整 (执行中~10%)')

  // ====== 统计 ======
  console.log('\n✅ 全部数据创建完成！\n📊 统计:')
  console.log(`  工厂: ${await prisma.factory.count()}`)
  console.log(`  部门: ${await prisma.module.count()}`)
  console.log(`  用户: ${await prisma.user.count()}`)
  console.log(`  产品: ${await prisma.product.count()}  | 负责人: ${await prisma.productAssignment.count()}`)
  console.log(`  模版: ${await prisma.checklistTemplate.count()}  | 检查项: ${await prisma.checklistItemDef.count()}`)
  console.log(`  变更项目: ${await prisma.changeProject.count()}`)

  const changes = await prisma.changeProject.findMany({ select:{ title:true, status:true }, orderBy:{createdAt:'asc'} })
  for (const c of changes) console.log(`    [${c.status}] ${c.title}`)
}

let serialCounter = 0

async function createProject(title:string, desc:string, priority:string, creatorId:string, moduleIds:string[], status:string, doneRatio:number, productId:string|null) {
  serialCounter++
  const change = await prisma.changeProject.create({
    data: {
      serial: serialCounter,
      title, description:desc, priority,
      status: status as any,
      productId: productId,
      plannedStart: new Date(Date.now() + 86400000),
      plannedEnd: new Date(Date.now() + 3*86400000),
      createdById: creatorId,
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    }
  })

  for (const mid of moduleIds) {
    const m = await prisma.module.findUnique({ where:{ id:mid } })
    const tpl = await prisma.checklistTemplate.findFirst({ where:{ moduleId:mid }, include:{ items:{ orderBy:{sortOrder:'asc'} } } })
    if (!m || !tpl) continue

    let cmStatus = status === 'DRAFT' ? 'PENDING' : status === 'APPROVING' ? 'REVIEWING' : status === 'COMPLETED' ? 'APPROVED' : 'EXECUTING'

    const cm = await prisma.changeModule.create({
      data: { changeProjectId:change.id, moduleId:mid, approverId:m.managerId, status:cmStatus as any,
        ...(cmStatus === 'APPROVED' ? { approvedAt:new Date() } : {}) }
    })

    // Create checklist items with appropriate status based on doneRatio
    const totalItems = tpl.items.length
    const doneCount = Math.round(totalItems * doneRatio)

    for (let i = 0; i < totalItems; i++) {
      const def = tpl.items[i]
      const itemStatus = i < doneCount ? 'DONE' : 'PENDING'
      await prisma.checklistItem.create({
        data: {
          changeModuleId: cm.id,
          title: def.title, description: def.description,
          evidenceType: def.evidenceType, isRequired: def.isRequired,
          sortOrder: def.sortOrder,
          executorId: creatorId, // 创建者作为执行人
          status: itemStatus as any,
          ...(itemStatus === 'DONE' ? { executedAt: new Date(), evidenceNotes: '已完成执行，结果正常' } : {}),
        }
      })
    }
  }
  return change
}

main().catch(console.error).finally(()=>prisma.$disconnect())

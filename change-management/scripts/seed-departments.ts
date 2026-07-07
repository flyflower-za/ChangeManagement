import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始为各部门创建模版和检查项...')

  // 获取所有用户和部门
  const users = await prisma.user.findMany()
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    include: { manager: true }
  })

  console.log(`找到 ${modules.length} 个部门: ${modules.map(m => m.name).join(', ')}`)
  console.log(`找到 ${users.length} 个用户`)

  // 获取 admin 用户
  const admin = users.find(u => u.role === 'admin') || users[0]
  if (!admin) {
    console.error('没有找到管理员用户')
    return
  }

  // 为每个部门定义检查项
  const departmentChecklists: Record<string, any[]> = {
    '设备部门': [
      { title: '设备状态检查', description: '确认设备运行状态正常，无异常报警', evidenceType: 'screenshot' },
      { title: '维护记录确认', description: '确认设备维护记录完整', evidenceType: 'text' },
      { title: '备件库存检查', description: '确认所需备件库存充足', evidenceType: 'log' },
      { title: '安全防护验证', description: '确认设备安全防护装置正常', evidenceType: 'screenshot' },
      { title: '操作规程更新', description: '确认设备操作规程为最新版本', evidenceType: 'config' },
      { title: '停机通知发布', description: '向相关方发布设备停机通知', evidenceType: 'text' },
      { title: '变更效果验证', description: '验证变更后设备运行效果', evidenceType: 'log' },
      { title: '操作人员培训', description: '完成操作人员新流程培训', evidenceType: 'text' },
    ],
    '工艺部门': [
      { title: '工艺参数备份', description: '备份当前工艺参数设置', evidenceType: 'config' },
      { title: '变更方案评审', description: '完成工艺变更方案评审', evidenceType: 'text' },
      { title: '试运行验证', description: '小批量试运行验证工艺参数', evidenceType: 'log' },
      { title: '产品质量检测', description: '试生产产品质量检测合格', evidenceType: 'screenshot' },
      { title: '工艺文件更新', description: '更新工艺文件和作业指导书', evidenceType: 'config' },
      { title: 'SOP修订确认', description: '确认标准操作程序已修订', evidenceType: 'config' },
      { title: '生产排程调整', description: '调整生产排程以配合变更', evidenceType: 'text' },
      { title: '变更效果跟踪', description: '建立变更效果跟踪机制', evidenceType: 'text' },
    ],
    '质量部门': [
      { title: '质量标准确认', description: '确认变更符合质量标准要求', evidenceType: 'text' },
      { title: '检验方法更新', description: '更新相关检验方法和标准', evidenceType: 'config' },
      { title: '检测设备校准', description: '确认检测设备校准状态', evidenceType: 'log' },
      { title: '样品测试', description: '完成变更后样品测试', evidenceType: 'screenshot' },
      { title: '不合格品处理', description: '制定不合格品处理预案', evidenceType: 'text' },
      { title: '质量记录归档', description: '完成质量相关记录归档', evidenceType: 'text' },
      { title: '客诉风险评估', description: '评估变更对客户投诉风险影响', evidenceType: 'text' },
      { title: '质量目标验证', description: '验证变更后质量目标达成情况', evidenceType: 'log' },
    ],
    '物流部门': [
      { title: '物流方案评估', description: '评估新物流方案可行性', evidenceType: 'text' },
      { title: '运输路线确认', description: '确认变更后运输路线', evidenceType: 'config' },
      { title: '仓储容量检查', description: '确认仓储容量满足需求', evidenceType: 'log' },
      { title: '信息系统更新', description: '更新物流信息系统', evidenceType: 'screenshot' },
      { title: '供应商通知', description: '通知相关供应商物流变更', evidenceType: 'text' },
      { title: '应急方案准备', description: '准备物流应急方案', evidenceType: 'text' },
      { title: '成本核算', description: '完成变更成本核算', evidenceType: 'log' },
      { title: '时效验证', description: '验证变更后物流时效', evidenceType: 'log' },
    ],
    '生产部门': [
      { title: '生产计划调整', description: '调整生产计划以配合变更', evidenceType: 'text' },
      { title: '人员安排确认', description: '确认变更所需人员安排', evidenceType: 'text' },
      { title: '物料准备检查', description: '确认变更所需物料准备就绪', evidenceType: 'log' },
      { title: '设备联动测试', description: '完成设备联动测试', evidenceType: 'screenshot' },
      { title: '生产节拍验证', description: '验证变更后生产节拍', evidenceType: 'log' },
      { title: '首件检验', description: '完成首件检验合格', evidenceType: 'screenshot' },
      { title: '异常预案确认', description: '确认生产异常应对预案', evidenceType: 'text' },
      { title: '产能验证', description: '验证变更后产能达标', evidenceType: 'log' },
      { title: '清洁验证', description: '完成变更后生产环境清洁验证', evidenceType: 'text' },
      { title: '交接班安排', description: '安排变更期间的交接班', evidenceType: 'text' },
    ],
  }

  // 为每个部门创建模版和检查项
  for (const module of modules) {
    const checklistItems = departmentChecklists[module.name] || []

    if (checklistItems.length === 0) {
      console.log(`跳过 ${module.name}：无预定义检查项`)
      continue
    }

    // 检查是否已有模版
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: { moduleId: module.id }
    })

    if (existingTemplate) {
      console.log(`${module.name} 已有模版，跳过创建`)
      continue
    }

    console.log(`为 ${module.name} 创建模版...`)

    // 创建模版
    const template = await prisma.checklistTemplate.create({
      data: {
        moduleId: module.id,
        name: `${module.name}变更检查清单`,
        description: `${module.name}相关变更的标准检查项`,
        createdBy: admin.id,
      }
    })

    // 创建检查项
    for (let i = 0; i < checklistItems.length; i++) {
      const item = checklistItems[i]
      await prisma.checklistItemDef.create({
        data: {
          templateId: template.id,
          title: item.title,
          description: item.description,
          evidenceType: item.evidenceType,
          isRequired: true,
          sortOrder: i + 1,
        }
      })
    }

    console.log(`✓ ${module.name}：创建 ${checklistItems.length} 项检查项`)
  }

  console.log('\n开始创建测试变更项目...')

  // 创建3个测试变更项目
  const testChanges = [
    {
      title: '生产线设备升级改造',
      description: '对生产线关键设备进行升级，提升生产效率和产品质量',
      priority: 'high',
      modules: ['设备部门', '生产部门', '质量部门'],
      plannedStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
      plannedEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
    },
    {
      title: '物流系统切换',
      description: '切换到新的物流管理系统，优化供应链流程',
      priority: 'critical',
      modules: ['物流部门', '设备部门'],
      plannedStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
      plannedEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10天后
    },
    {
      title: '工艺参数优化项目',
      description: '优化关键工艺参数，提高产品一致性和良品率',
      priority: 'medium',
      modules: ['工艺部门', '质量部门', '生产部门'],
      plannedStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14天后
      plannedEnd: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21天后
    },
  ]

  for (const changeData of testChanges) {
    // 找到相关的模块
    const relatedModules = modules.filter(m => changeData.modules.includes(m.name))

    if (relatedModules.length === 0) {
      console.log(`跳过变更 "${changeData.title}"：未找到相关模块`)
      continue
    }

    // 创建变更项目
    const changeProject = await prisma.changeProject.create({
      data: {
        title: changeData.title,
        description: changeData.description,
        priority: changeData.priority,
        status: 'EXECUTING',
        plannedStart: changeData.plannedStart,
        plannedEnd: changeData.plannedEnd,
        createdById: admin.id,
      }
    })

    // 为每个模块创建变更模块和检查项
    for (const module of relatedModules) {
      // 获取该模块的模版
      const template = await prisma.checklistTemplate.findFirst({
        where: { moduleId: module.id },
        include: { items: true }
      })

      if (!template) {
        console.log(`  警告：${module.name} 没有模版，跳过`)
        continue
      }

      // 创建变更模块
      const changeModule = await prisma.changeModule.create({
        data: {
          changeProjectId: changeProject.id,
          moduleId: module.id,
          approverId: module.managerId || admin.id,
          status: 'EXECUTING',
        }
      })

      // 根据模版创建检查项实例
      for (const itemDef of template.items) {
        await prisma.checklistItem.create({
          data: {
            changeModuleId: changeModule.id,
            title: itemDef.title,
            description: itemDef.description,
            expectedResult: itemDef.expectedResult,
            evidenceType: itemDef.evidenceType,
            isRequired: itemDef.isRequired,
            sortOrder: itemDef.sortOrder,
            status: Math.random() > 0.5 ? 'DONE' : 'PENDING', // 随机状态用于测试
            executedAt: Math.random() > 0.5 ? new Date() : null,
            evidenceNotes: Math.random() > 0.5 ? '已完成执行，结果正常' : null,
          }
        })
      }
    }

    console.log(`✓ 创建变更项目：${changeData.title}`)
    console.log(`  - 涉及部门：${relatedModules.map(m => m.name).join(', ')}`)
  }

  console.log('\n✅ 测试数据创建完成！')
  console.log('\n统计信息：')
  const templateCount = await prisma.checklistTemplate.count()
  const itemCount = await prisma.checklistItemDef.count()
  const changeCount = await prisma.changeProject.count()
  console.log(`- 模版总数：${templateCount}`)
  console.log(`- 检查项总数：${itemCount}`)
  console.log(`- 变更项目数：${changeCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

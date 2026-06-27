import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('更新工艺、设备、质量部门的检查项...\n')

  const modules = await prisma.module.findMany({
    where: { name: { in: ['工艺部门', '设备部门', '质量部门'] } },
    include: { templates: true }
  })

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!admin) {
    console.error('没有找到管理员用户')
    return
  }

  const departmentItems: Record<string, any[]> = {
    '工艺部门': [
      { title: '工艺参数备份', description: '备份当前工艺参数设置到安全位置', evidenceType: 'config' },
      { title: '变更方案评审', description: '组织技术团队完成工艺变更方案评审', evidenceType: 'text' },
      { title: '影响范围评估', description: '评估工艺变更对上下游工序的影响', evidenceType: 'text' },
      { title: '试运行验证', description: '在小批量产线上试运行验证工艺参数', evidenceType: 'log' },
      { title: '产品质量检测', description: '对试生产产品进行全项质量检测', evidenceType: 'screenshot' },
      { title: '工艺文件更新', description: '更新工艺流程图和作业指导书', evidenceType: 'config' },
      { title: 'SOP修订确认', description: '确认标准操作程序已修订并发布', evidenceType: 'config' },
      { title: '生产排程调整', description: '调整生产排程计划以配合变更窗口', evidenceType: 'text' },
      { title: '操作人员培训', description: '完成相关操作人员的工艺变更培训', evidenceType: 'text' },
      { title: '变更效果跟踪', description: '建立变更后72小时效果跟踪机制', evidenceType: 'log' },
    ],
    '设备部门': [
      { title: '设备运行状态检查', description: '确认设备当前运行状态正常，无异常报警', evidenceType: 'screenshot' },
      { title: '历史维护记录确认', description: '检查设备近期维护记录是否完整合规', evidenceType: 'text' },
      { title: '备件库存核查', description: '确认变更所需备品备件库存充足', evidenceType: 'log' },
      { title: '安全防护装置验证', description: '逐一验证设备安全防护装置功能正常', evidenceType: 'screenshot' },
      { title: '操作规程更新', description: '确保设备操作规程为最新有效版本', evidenceType: 'config' },
      { title: '停机通知发布', description: '向所有相关方发布设备停机变更通知', evidenceType: 'text' },
      { title: '应急预案确认', description: '确认设备故障应急处理预案就绪', evidenceType: 'text' },
      { title: '变更后功能测试', description: '完成变更后设备功能验证测试', evidenceType: 'log' },
      { title: '运行参数基线记录', description: '记录变更后设备运行参数作为新基线', evidenceType: 'config' },
    ],
    '质量部门': [
      { title: '质量标准符合性确认', description: '确认变更内容符合相关质量标准要求', evidenceType: 'text' },
      { title: '检验方法更新', description: '更新因变更而调整的检验方法和判定标准', evidenceType: 'config' },
      { title: '检测设备校准检查', description: '确认所有相关检测设备的校准状态有效', evidenceType: 'log' },
      { title: '变更前样品留样', description: '完成变更前产品的留样封存工作', evidenceType: 'screenshot' },
      { title: '试产样品全项测试', description: '对变更后试产样品进行全项质量测试', evidenceType: 'log' },
      { title: '不合格品处置预案', description: '制定变更期间不合格品的处置预案', evidenceType: 'text' },
      { title: '质量记录归档', description: '完成变更过程所有质量记录的整理归档', evidenceType: 'text' },
      { title: '客诉风险评估', description: '评估此次变更对客户投诉率的潜在影响', evidenceType: 'text' },
      { title: '质量目标达成验证', description: '对比变更前后质量目标达成情况', evidenceType: 'log' },
    ],
  }

  for (const module of modules) {
    const newItems = departmentItems[module.name]
    if (!newItems || newItems.length === 0) continue

    console.log(`处理 ${module.name}...`)

    // Find or create template
    let template = module.templates[0]
    if (template) {
      // Delete old items and recreate
      await prisma.checklistItemDef.deleteMany({
        where: { templateId: template.id }
      })
      console.log(`  已清除旧检查项`)
    } else {
      // Create new template
      template = await prisma.checklistTemplate.create({
        data: {
          moduleId: module.id,
          name: `${module.name}变更检查清单`,
          description: `${module.name}相关变更的标准检查项`,
          createdBy: admin.id,
        }
      })
      console.log(`  已创建新模版`)
    }

    // Create new items
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i]
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

    console.log(`  ✓ 已添加 ${newItems.length} 项检查项`)
  }

  console.log('\n✅ 更新完成！')

  // Show summary
  const summary = await prisma.checklistTemplate.findMany({
    include: {
      module: { select: { name: true } },
      items: true,
    }
  })

  console.log('\n📊 当前各模块检查项统计：')
  for (const tpl of summary) {
    console.log(`  ${(tpl.module as any).name}: ${tpl.items.length} 项`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

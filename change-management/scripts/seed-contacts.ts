import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('为各部门添加联系人...\n')

  const modules = await prisma.module.findMany({
    where: { isActive: true }
  })

  // 部门联系人定义
  const departmentContacts: Record<string, Array<{ name: string; title: string }>> = {
    '设备部门': [
      { name: '陈工', title: '设备部经理' },
      { name: '小刘', title: '冲压设备负责人' },
      { name: '老张', title: '焊接设备负责人' },
      { name: '小王', title: '总装设备负责人' },
    ],
    '工艺部门': [
      { name: '赵工', title: '工艺部经理' },
      { name: '小孙', title: '冲压工艺负责人' },
      { name: '小周', title: '焊接工艺负责人' },
      { name: '小吴', title: '涂装工艺负责人' },
    ],
    '质量部门': [
      { name: '钱工', title: '质量部经理' },
      { name: '小李', title: '来料检验负责人' },
      { name: '小郑', title: '过程质量负责人' },
      { name: '小冯', title: '成品检验负责人' },
    ],
    '物流部门': [
      { name: '孙工', title: '物流部经理' },
      { name: '小马', title: '仓储负责人' },
      { name: '小朱', title: '运输调度负责人' },
    ],
    '生产部门': [
      { name: '李工', title: '生产部经理' },
      { name: '杨班', title: 'A线班长' },
      { name: '刘班', title: 'B线班长' },
      { name: '黄班', title: 'C线班长' },
      { name: '小何', title: '设备维护负责人' },
    ],
  }

  for (const module of modules) {
    const contacts = departmentContacts[module.name]
    if (!contacts || contacts.length === 0) continue

    // Check if contacts already exist
    const existingCount = await prisma.departmentContact.count({
      where: { moduleId: module.id }
    })

    if (existingCount > 0) {
      console.log(`${module.name} 已有联系人，跳过`)
      continue
    }

    console.log(`为 ${module.name} 添加 ${contacts.length} 个联系人:`)
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i]
      await prisma.departmentContact.create({
        data: {
          moduleId: module.id,
          name: contact.name,
          title: contact.title,
          sortOrder: i + 1,
        }
      })
      console.log(`  ✓ ${contact.title}: ${contact.name}`)
    }
  }

  // Show summary
  const summary = await prisma.departmentContact.findMany({
    include: { module: { select: { name: true } } }
  })

  console.log(`\n✅ 共添加 ${summary.length} 个联系人`)
  for (const mod of modules) {
    const count = summary.filter(c => c.moduleId === mod.id).length
    console.log(`  ${mod.name}: ${count} 个`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

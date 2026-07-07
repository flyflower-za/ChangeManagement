import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('为各部门创建产品线...\n')

  const modules = await prisma.module.findMany({ where: { isActive: true } })

  // 产品线定义: 部门名 -> [产品线名, 联系人列表]
  const productLines: Record<string, Array<{ name: string; description: string; contacts: Array<{ name: string; title: string }> }>> = {
    '设备部门': [
      {
        name: '冲压线',
        description: '冲压设备及模具',
        contacts: [
          { name: '小刘', title: '冲压设备负责人' },
          { name: '老陈', title: '冲压模具工程师' },
        ]
      },
      {
        name: '焊接线',
        description: '焊接设备及工装',
        contacts: [
          { name: '老张', title: '焊接设备负责人' },
          { name: '小方', title: '焊接工艺工程师' },
        ]
      },
      {
        name: '总装线',
        description: '总装及检测设备',
        contacts: [
          { name: '小王', title: '总装设备负责人' },
          { name: '小罗', title: '检测设备技术员' },
        ]
      },
    ],
    '工艺部门': [
      {
        name: '冲压工艺',
        description: '冲压工艺参数及流程',
        contacts: [
          { name: '小孙', title: '冲压工艺负责人' },
          { name: '老高', title: '模具设计工程师' },
        ]
      },
      {
        name: '焊接工艺',
        description: '焊接工艺参数及流程',
        contacts: [
          { name: '小周', title: '焊接工艺负责人' },
          { name: '小唐', title: '焊接参数工程师' },
        ]
      },
      {
        name: '涂装工艺',
        description: '涂装工艺及参数',
        contacts: [
          { name: '小吴', title: '涂装工艺负责人' },
          { name: '小宋', title: '涂装质量工程师' },
        ]
      },
    ],
    '质量部门': [
      {
        name: '来料检验',
        description: '原材料及外协件质量',
        contacts: [
          { name: '小李', title: '来料检验负责人' },
          { name: '小段', title: '外协件质量工程师' },
        ]
      },
      {
        name: '过程质量',
        description: '生产过程质量控制',
        contacts: [
          { name: '小郑', title: '过程质量负责人' },
          { name: '小蒋', title: 'SPC工程师' },
        ]
      },
      {
        name: '成品检验',
        description: '成品及出货质量',
        contacts: [
          { name: '小冯', title: '成品检验负责人' },
          { name: '小韩', title: '可靠性测试工程师' },
        ]
      },
    ],
    '物流部门': [
      {
        name: '原材料物流',
        description: '原材料入库及配送',
        contacts: [
          { name: '小马', title: '仓储负责人' },
          { name: '小曹', title: '入库管理专员' },
        ]
      },
      {
        name: '成品物流',
        description: '成品出库及发运',
        contacts: [
          { name: '小朱', title: '运输调度负责人' },
          { name: '小魏', title: '发运管理专员' },
        ]
      },
    ],
    '生产部门': [
      {
        name: 'A线',
        description: 'A生产线 - 主力产品',
        contacts: [
          { name: '杨班', title: 'A线班长' },
          { name: '小沈', title: 'A线工艺员' },
        ]
      },
      {
        name: 'B线',
        description: 'B生产线 - 高附加值产品',
        contacts: [
          { name: '刘班', title: 'B线班长' },
          { name: '小彭', title: 'B线工艺员' },
        ]
      },
      {
        name: 'C线',
        description: 'C生产线 - 新产品试制',
        contacts: [
          { name: '黄班', title: 'C线班长' },
          { name: '小吕', title: 'C线工艺员' },
        ]
      },
    ],
  }

  let totalLines = 0
  let totalContacts = 0

  for (const module of modules) {
    const lines = productLines[module.name]
    if (!lines || lines.length === 0) continue

    // Check if already exists
    const existingCount = await prisma.productLine.count({ where: { moduleId: module.id } })
    if (existingCount > 0) {
      console.log(`${module.name} 已有产品线，跳过`)
      continue
    }

    console.log(`\n${module.name}:`)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const productLine = await prisma.productLine.create({
        data: {
          moduleId: module.id,
          name: line.name,
          description: line.description,
          sortOrder: i + 1,
        }
      })

      for (let j = 0; j < line.contacts.length; j++) {
        const contact = line.contacts[j]
        await prisma.productLineContact.create({
          data: {
            productLineId: productLine.id,
            name: contact.name,
            title: contact.title,
            sortOrder: j + 1,
          }
        })
        totalContacts++
      }

      console.log(`  ✓ ${line.name} (${line.contacts.length}人)`)
      totalLines++
    }
  }

  console.log(`\n✅ 共创建 ${totalLines} 条产品线，${totalContacts} 个联系人`)

  // Summary
  const summary = await prisma.productLine.findMany({
    include: { contacts: true, module: { select: { name: true } } }
  })
  for (const pl of summary) {
    console.log(`  ${pl.module.name} - ${pl.name}: ${pl.contacts.map(c => c.name).join(', ')}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

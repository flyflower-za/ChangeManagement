import { prisma } from '@/lib/db'

/**
 * 检查用户是否是模块负责人
 * @param userId - 用户ID
 * @param moduleId - 模块ID
 * @returns Promise<boolean>
 */
export async function isModuleManager(userId: string, moduleId: string): Promise<boolean> {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { managerId: true }
  })
  return module?.managerId === userId
}

/**
 * 检查用户是否可以编辑模块（管理员或模块负责人）
 * @param userId - 用户ID
 * @param moduleId - 模块ID
 * @returns Promise<boolean>
 */
export async function canEditModule(userId: string, moduleId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user) return false
  if (user.role === 'admin') return true

  return isModuleManager(userId, moduleId)
}

/**
 * 检查用户是否可以管理模块的Checklist模板
 * @param userId - 用户ID
 * @param moduleId - 模块ID
 * @returns Promise<boolean>
 */
export async function canManageTemplates(userId: string, moduleId: string): Promise<boolean> {
  return canEditModule(userId, moduleId)
}

/**
 * 获取用户负责的所有模块
 * @param userId - 用户ID
 * @returns Promise<Module[]> 用户负责的模块列表
 */
export async function getManagedModules(userId: string) {
  return prisma.module.findMany({
    where: { managerId: userId, isActive: true },
    include: {
      manager: true,
      templates: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      _count: {
        select: {
          changeModules: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })
}

/**
 * 检查用户是否应该查看影响其模块的变更
 * @param userId - 用户ID
 * @returns Promise<boolean>
 */
export async function canViewModuleChanges(userId: string): Promise<boolean> {
  const managedCount = await prisma.module.count({
    where: { managerId: userId, isActive: true }
  })
  return managedCount > 0
}

/**
 * 获取权限错误消息用于显示
 * @param action - 尝试执行的操作
 * @returns string - 人类可读的错误消息
 */
export function getPermissionError(action: string): string {
  const messages: Record<string, string> = {
    edit_module: '只有管理员或模块负责人可以编辑此模块',
    manage_templates: '只有管理员或模块负责人可以管理此模块的Checklist模板',
    view_module_changes: '您没有权限查看此模块的变更',
    assign_manager: '只有管理员可以分配模块负责人',
    not_manager: '您不是此模块的负责人',
    login_required: '请先登录'
  }
  return messages[action] || '权限不足'
}

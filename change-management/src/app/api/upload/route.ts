import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const itemId = formData.get('itemId') as string

  if (!file || !itemId) {
    return NextResponse.json({ error: '缺少文件或检查项ID' }, { status: 400 })
  }

  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }

  // Generate unique filename
  const ext = path.extname(file.name)
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
  const filePath = path.join(UPLOAD_DIR, uniqueName)

  // Determine file type
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
  const docExts = ['.pdf']
  const sheetExts = ['.xls', '.xlsx', '.csv']
  const wordExts = ['.doc', '.docx']
  let fileType = 'other'
  if (imageExts.includes(ext.toLowerCase())) fileType = 'image'
  else if (docExts.includes(ext.toLowerCase())) fileType = 'pdf'
  else if (wordExts.includes(ext.toLowerCase())) fileType = 'word'
  else if (sheetExts.includes(ext.toLowerCase())) fileType = 'excel'

  // Save file
  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  // Save to database
  const attachment = await prisma.attachment.create({
    data: {
      checklistItemId: itemId,
      fileName: file.name,
      filePath: `/uploads/${uniqueName}`,
      fileType,
      fileSize: file.size,
    }
  })

  return NextResponse.json(attachment, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await req.json()
  const { id } = body

  const attachment = await prisma.attachment.findUnique({ where: { id } })
  if (!attachment) return NextResponse.json({ error: '附件不存在' }, { status: 404 })

  // Delete file from disk
  try {
    const fs = await import('fs/promises')
    await fs.unlink(path.join(process.cwd(), 'public', attachment.filePath))
  } catch (e) {
    // file may already be deleted
  }

  await prisma.attachment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

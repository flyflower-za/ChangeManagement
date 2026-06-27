'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ModulesPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/management') }, [router])
  return <div className="text-gray-400">跳转至管理中心...</div>
}

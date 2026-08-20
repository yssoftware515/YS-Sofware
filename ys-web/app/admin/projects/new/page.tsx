'use client'

import { ProjectForm } from '@/components/admin/ProjectForm'
import { useAuth } from '@/components/admin/PermissionGate'

export default function NewProjectPage() {
  const { hasPermission } = useAuth()

  return <ProjectForm canViewFinancials={hasPermission('view_financials')} />
}

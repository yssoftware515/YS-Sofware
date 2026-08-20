'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Plus, CalendarClock, FlagTriangleRight } from 'lucide-react'
import { adminCreate, adminList, adminPatch } from '@/lib/admin/api'
import { useToast } from '@/components/admin/Toast'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/admin/format'

export interface DeliverySummary {
  total_tasks: number
  completed_tasks: number
  remaining_tasks: number
  blocked_tasks: number
  overdue_tasks: number
  total_milestones: number
  completed_milestones: number
  overdue_milestones: number
  next_milestone: { id: string; title: string; target_date: string } | null
  next_due_task: { id: string; title: string; due_date: string } | null
}

type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

interface TaskItem {
  id: string
  project_id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  is_overdue: boolean
  days_overdue: number | null
}

interface MilestoneItem {
  id: string
  project_id: string
  title: string
  status: MilestoneStatus
  target_date: string | null
  completed_at: string | null
  sort_order: number | null
  is_overdue: boolean
  days_overdue: number | null
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const TASK_STATUS_VARIANT: Record<TaskStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  todo: 'default',
  in_progress: 'warning',
  blocked: 'error',
  completed: 'success',
  cancelled: 'outline',
}

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const MILESTONE_STATUS_VARIANT: Record<MilestoneStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  pending: 'default',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'outline',
}

const PRIORITY_VARIANT: Record<TaskPriority, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  low: 'default',
  normal: 'outline',
  high: 'warning',
  urgent: 'error',
}

interface ProjectDeliveryProps {
  projectId: string
  delivery: DeliverySummary
  canManage: boolean
}

export function ProjectDelivery({ projectId, delivery, canManage }: ProjectDeliveryProps) {
  const queryClient = useQueryClient()
  const { show } = useToast()
  const [taskResetKey, setTaskResetKey] = useState(0)
  const [milestoneResetKey, setMilestoneResetKey] = useState(0)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/admin/projects', projectId] })
  }

  const tasksQuery = useQuery({
    queryKey: ['/admin/tasks', projectId],
    queryFn: () => adminList<TaskItem>('/admin/tasks', { project_id: projectId, per_page: '200' }),
  })
  const tasks = tasksQuery.data ?? []

  const milestonesQuery = useQuery({
    queryKey: ['/admin/milestones', projectId],
    queryFn: () => adminList<MilestoneItem>('/admin/milestones', { project_id: projectId }),
  })
  const milestones = milestonesQuery.data ?? []

  const updateTaskStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      adminPatch(`/admin/tasks/${id}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/admin/tasks', projectId] }); refresh() },
    onError: () => show('error', 'Failed to update the task status.'),
  })

  const updateMilestoneStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MilestoneStatus }) =>
      adminPatch(`/admin/milestones/${id}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/admin/milestones', projectId] }); refresh() },
    onError: () => show('error', 'Failed to update the milestone status.'),
  })

  const moveMilestone = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      adminCreate(`/admin/milestones/${id}/move`, { direction }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/admin/milestones', projectId] }); refresh() },
    onError: () => show('error', 'Failed to reorder milestones.'),
  })

  const createTask = useMutation({
    mutationFn: (data: { title: string; due_date: string; priority: TaskPriority }) =>
      adminCreate('/admin/tasks', { project_id: projectId, ...data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/admin/tasks', projectId] }); refresh(); setTaskResetKey(k => k + 1) },
    onError: () => show('error', 'Failed to add the task.'),
  })

  const createMilestone = useMutation({
    mutationFn: (data: { title: string; target_date: string }) =>
      adminCreate('/admin/milestones', { project_id: projectId, ...data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/admin/milestones', projectId] }); refresh(); setMilestoneResetKey(k => k + 1) },
    onError: () => show('error', 'Failed to create the milestone.'),
  })

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{
        borderRadius: '0.875rem', border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', padding: '1rem 1.25rem',
      }}>
        <div style={{ marginBottom: '0.875rem' }}>
          <h2 className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)' }}>Delivery</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
            Tasks and milestones tracked against this engagement — real counts, never estimates.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DeliveryMetric label="Tasks" value={String(delivery.total_tasks)} />
          <DeliveryMetric label="Remaining" value={String(delivery.remaining_tasks)} />
          <DeliveryMetric label="Blocked" value={String(delivery.blocked_tasks)} accent={delivery.blocked_tasks > 0 ? '#EF4444' : undefined} />
          <DeliveryMetric label="Overdue" value={String(delivery.overdue_tasks)} accent={delivery.overdue_tasks > 0 ? '#EF4444' : undefined} />
          <DeliveryMetric label="Milestones done" value={`${delivery.completed_milestones}/${delivery.total_milestones}`} />
          <DeliveryMetric label="Overdue milestones" value={String(delivery.overdue_milestones)} accent={delivery.overdue_milestones > 0 ? '#EF4444' : undefined} />
          <div style={{ gridColumn: 'span 2' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CalendarClock size={13} /> Next milestones
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground)', marginTop: '0.25rem' }}>
              {delivery.next_milestone
                ? <Link href={`/admin/projects/${projectId}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>{delivery.next_milestone.title}</Link>
                : '—'}
            </p>
            {delivery.next_milestone && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                Targeted {formatDate(delivery.next_milestone.target_date)} · {delivery.overdue_milestones} overdue
              </p>
            )}
          </div>
          <div style={{ maxWidth: '100%' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <FlagTriangleRight size={13} /> Next due task
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground)', marginTop: '0.25rem' }}>
              {delivery.next_due_task ? delivery.next_due_task.title : '—'}
            </p>
            {delivery.next_due_task && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                Due {formatDate(delivery.next_due_task.due_date)} · {delivery.overdue_tasks} overdue
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{
        borderRadius: '0.875rem', border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div>
            <h3 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)' }}>Tasks</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>Executable work items inside this delivery</p>
          </div>
          {canManage && (
            <AddTaskForm key={taskResetKey} onSubmit={(data) => createTask.mutate(data)} pending={createTask.isPending} error={createTask.isError ? 'Failed to add the task.' : null} />
          )}
        </div>

        {tasksQuery.isLoading ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>Loading tasks...</p>
        ) : tasksQuery.isError ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>Could not load tasks for this delivery.</p>
        ) : tasks.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>No tasks for this engagement yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tasks.map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                padding: '0.625rem 0', borderBottom: '1px solid var(--color-border-subtle)',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                    <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                    {task.due_date && (
                      <span style={{ fontSize: '0.75rem', color: task.is_overdue ? '#EF4444' : 'var(--color-foreground-muted)' }}>
                        {task.is_overdue ? `Overdue ${task.days_overdue}d` : `Due ${formatDate(task.due_date)}`}
                      </span>
                    )}
                  </span>
                </div>
                {canManage ? (
                  <select
                    value={task.status}
                    disabled={updateTaskStatus.isPending && updateTaskStatus.variables?.id === task.id}
                    onChange={e => updateTaskStatus.mutate({ id: task.id, status: e.target.value as TaskStatus })}
                    style={{ padding: '0.375rem 0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none' }}
                  >
                    {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
                      <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={TASK_STATUS_VARIANT[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        borderRadius: '0.875rem', border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div>
            <h3 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)' }}>Milestones</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>Stage markers of this delivery, in order</p>
          </div>
          {canManage && (
            <AddMilestoneForm key={milestoneResetKey} onSubmit={(data) => createMilestone.mutate(data)} pending={createMilestone.isPending} error={createMilestone.isError ? 'Failed to create milestone.' : null} />
          )}
        </div>

        {milestonesQuery.isLoading ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>Loading milestones...</p>
        ) : milestonesQuery.isError ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>Could not load milestones for this delivery.</p>
        ) : milestones.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>No milestones for this engagement yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {milestones.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                padding: '0.625rem 0', borderBottom: '1px solid var(--color-border-subtle)',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 700,
                  backgroundColor: m.status === 'completed' ? 'var(--color-success)' : 'var(--color-background-muted)',
                  color: m.status === 'completed' ? 'white' : 'var(--color-foreground-muted)',
                }}>
                  {m.sort_order ?? '·'}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground)' }}>
                    {m.title}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: m.is_overdue ? '#EF4444' : 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
                    {m.target_date
                      ? (m.is_overdue ? `Overdue ${m.days_overdue}d — was ${formatDate(m.target_date)}` : `Target ${formatDate(m.target_date)}`)
                      : 'No target date'}
                  </span>
                </div>
                {canManage && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      onClick={() => moveMilestone.mutate({ id: m.id, direction: 'up' })}
                      disabled={moveMilestone.isPending}
                      title="Move up"
                      style={{ padding: '0.25rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-foreground-muted)' }}
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      onClick={() => moveMilestone.mutate({ id: m.id, direction: 'down' })}
                      disabled={moveMilestone.isPending}
                      title="Move down"
                      style={{ padding: '0.25rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-foreground-muted)' }}
                    >
                      <ArrowRight size={13} />
                    </button>
                  </span>
                )}
                {canManage ? (
                  <select
                    value={m.status}
                    disabled={updateMilestoneStatus.isPending && updateMilestoneStatus.variables?.id === m.id}
                    onChange={e => updateMilestoneStatus.mutate({ id: m.id, status: e.target.value as MilestoneStatus })}
                    style={{ padding: '0.375rem 0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none' }}
                  >
                    {(Object.keys(MILESTONE_STATUS_LABELS) as MilestoneStatus[]).map(s => (
                      <option key={s} value={s}>{MILESTONE_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={MILESTONE_STATUS_VARIANT[m.status]}>{MILESTONE_STATUS_LABELS[m.status]}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function DeliveryMetric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: accent ?? 'var(--color-foreground)', marginTop: '0.25rem' }}>{value}</p>
    </div>
  )
}

interface AddTaskFormProps {
  onSubmit: (data: { title: string; due_date: string; priority: TaskPriority }) => void
  pending: boolean
  error: string | null
}

function AddTaskForm({ onSubmit, pending, error }: AddTaskFormProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    // Inputs are intentionally NOT cleared here — a failed mutation must
    // not eat the admin's typed content. The form remounts (fresh state)
    // via its `key` only after the parent reports a successful create.
    onSubmit({ title: title.trim(), due_date: dueDate, priority: 'normal' })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Add a task..."
        style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none', minWidth: '12rem' }}
      />
      <input
        type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
        style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none' }}
      />
      <button type="submit" disabled={pending || !title.trim()}
        style={{ padding: '0.5rem 0.875rem', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'var(--color-accent)', color: 'white', fontSize: '0.8125rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <Plus size={13} /> Add
      </button>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{error}</span>}
    </form>
  )
}

interface AddMilestoneFormProps {
  onSubmit: (data: { title: string; target_date: string }) => void
  pending: boolean
  error: string | null
}

function AddMilestoneForm({ onSubmit, pending, error }: AddMilestoneFormProps) {
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    // Same contract as AddTaskForm: content survives failed submissions;
    // the parent remounts this form only on a successful create.
    onSubmit({ title: title.trim(), target_date: targetDate })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Add a milestone..."
        style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none', minWidth: '12rem' }}
      />
      <input
        type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
        style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none' }}
      />
      <button type="submit" disabled={pending || !title.trim()}
        style={{ padding: '0.5rem 0.875rem', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'var(--color-accent)', color: 'white', fontSize: '0.8125rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <Plus size={13} /> Add
      </button>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{error}</span>}
    </form>
  )
}
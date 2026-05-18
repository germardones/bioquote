import { db, auth } from '../firebase/firebaseConfig'
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { STATUS } from '../constants/projectStatus'

/**
 * Update a project's status and append an entry to its history[] array.
 * History entries: { at: ISO string, by: uid/email, from: previousStatus, to: newStatus, note? }
 *
 * @param {object} project - the project document data (must include id and current status)
 * @param {string} newStatus - one of STATUS.*
 * @param {object} [extra]  - additional fields to merge into the update (e.g. kanban_column)
 */
export async function changeProjectStatus(project, newStatus, extra = {}) {
  const user = auth.currentUser
  const ref = doc(db, 'projects', project.id)

  const historyEntry = {
    at: new Date().toISOString(),
    by: user?.email || user?.uid || 'system',
    from: project.status || null,
    to: newStatus
  }

  const update = {
    status: newStatus,
    updated_at: serverTimestamp(),
    history: arrayUnion(historyEntry),
    ...extra
  }

  // When a quote is approved, stamp the approval timestamp.
  if (newStatus === STATUS.APPROVED) update.approved_at = serverTimestamp()
  // When the project starts execution, initialise the kanban column.
  if (newStatus === STATUS.EN_CURSO && !project.kanban_column) {
    update.kanban_column = 'Backlog'
    update.started_at = serverTimestamp()
  }
  if (newStatus === STATUS.COMPLETED) update.completed_at = serverTimestamp()

  await updateDoc(ref, update)
  return historyEntry
}

/** Move a project across kanban columns (only meaningful for status = En Curso) */
export async function changeKanbanColumn(project, newColumn) {
  const ref = doc(db, 'projects', project.id)
  await updateDoc(ref, {
    kanban_column: newColumn,
    updated_at: serverTimestamp()
  })
}

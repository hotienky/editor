/* 记录历史记录的公共组
{
  done: [],        // 能撤销的记录数组
  undone: [],      // 能重做的记录数组
  isUndoRedo: false // 是否正在执行撤销 / 重做
}
*/

export const addHistory = (records, stepType, data) => {
  if (records.value.isUndoRedo || !data) return

  stepType === 'editor'
    ? addHistoryEditor(records, stepType, data)
    : addHistoryPage(records, stepType, data)
}

/* ================= 编辑器历史 ================= */

const addHistoryEditor = (records, stepType, data) => {
  const undoneCount = data?.undone?.eventCount || 0
  if (undoneCount > 0) return

  const eventCount = data?.done?.eventCount || 0
  if (eventCount === 0) return

  const { done } = records.value
  const currentCount = done.filter((item) => item.type === stepType).length

  if (currentCount < eventCount) {
    for (let i = currentCount; i < eventCount; i++) {
      done.push({ type: stepType })
    }
  }

  resetUndone(records)
}

/* ================= 页面历史 ================= */

const addHistoryPage = (records, stepType, data) => {
  if (!stepType) return

  const { proType, newData, oldData } = data
  if (!proType || !newData || !oldData) return

  // 值相同不记录
  if (isEqual(newData, oldData)) return

  records.value.done.push({ type: stepType, ...data })
  resetUndone(records)
}

/* ================= 公共工具 ================= */

const resetUndone = (records) => {
  records.value.undone = []
}

const isEqual = (a, b) => {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false

  if (typeof a === 'object') {
    // 数组
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false
      return a.every((item, i) => isEqual(item, b[i]))
    }

    // 对象
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false

    return keysA.every((key) => keysB.includes(key) && isEqual(a[key], b[key]))
  }

  return false
}

/* ================= 撤销 / 重做 ================= */

const withUndoRedoFlag = (records, fn) => {
  records.value.isUndoRedo = true
  try {
    fn()
  } catch (e) {}
  setTimeout(() => {
    records.value.isUndoRedo = false
  }, 0)
}

// 撤销
export const undoHistoryRecord = (records, method) => {
  const { done } = records.value
  if (done.length === 0) return

  withUndoRedoFlag(records, () => {
    const record = done.pop()
    method(record)
    records.value.undone.unshift(record)
  })
}

// 重做
export const redoHistoryRecord = (records, method) => {
  const { undone } = records.value
  if (undone.length === 0) return

  withUndoRedoFlag(records, () => {
    const record = undone.shift()
    method(record)
    records.value.done.push(record)
  })
}

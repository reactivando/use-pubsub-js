export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait = 100,
  immediate = false,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let args: Parameters<T> | null = null
  let context: unknown
  let timestamp = 0
  let result: ReturnType<T> | undefined

  function later() {
    const last = Date.now() - timestamp

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last)
    } else {
      timeout = null
      if (!immediate) {
        result = func.apply(context, args as Parameters<T>)
        context = args = null
      }
    }
  }

  const debounced = function (this: unknown, ..._args: Parameters<T>) {
    context = this
    args = _args
    timestamp = Date.now()
    const callNow = immediate && !timeout
    if (!timeout) {
      timeout = setTimeout(later, wait)
    }
    if (callNow) {
      result = func.apply(context, args)
      context = args = null
    }

    return result
  }

  debounced.clear = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  debounced.flush = () => {
    if (timeout) {
      result = func.apply(context, args as Parameters<T>)
      context = args = null

      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

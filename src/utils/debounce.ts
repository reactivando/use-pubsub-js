/* eslint-disable */

/* eslint-disable func-names */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-multi-assign */
export function debounce<T extends Function>(
  func: T,
  wait = 100,
  immediate = false,
) {
  let timeout: ReturnType<typeof setTimeout> | null
  let args: unknown
  let context: unknown
  let timestamp: number
  let result: unknown

  function later() {
    const last = Date.now() - timestamp

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last)
    } else {
      timeout = null
      if (!immediate) {
        result = func.apply(context, args as any)
        context = args = null
      }
    }
  }

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    context = this
    timestamp = Date.now()
    const callNow = immediate && !timeout
    if (!timeout) timeout = setTimeout(later, wait)
    if (callNow) {
      result = func.apply(context, args)
      context = args = null
    }

    return result
  }

  debounced.clear = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  debounced.flush = function () {
    if (timeout) {
      result = func.apply(context, args as any)
      context = args = null

      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

// Adds compatibility for ES modules
debounce.debounce = debounce

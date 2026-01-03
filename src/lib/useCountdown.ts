import { Ref, onUnmounted } from 'vue'

export function useCountdown(
  countRef: Ref<number>,
  max: number,
  options?: {
    interval?: number
    onFinish?: () => void
  }
) {
  const interval = options?.interval ?? 1000
  let timer: ReturnType<typeof setInterval> | null = null

  const start = () => {
    stop()
    countRef.value = max

    timer = setInterval(() => {
      if (countRef.value <= 0) {
        stop()
        options?.onFinish?.()
      } else {
        countRef.value--
      }
    }, interval)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const reset = () => {
    stop()
    countRef.value = max
  }

  onUnmounted(stop)

  return {
    start,
    stop,
    reset
  }
}

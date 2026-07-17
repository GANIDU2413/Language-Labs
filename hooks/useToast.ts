'use client'

import { useEffect, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
}

const AUTO_DISMISS_MS = 4000

// Tiny module-level store so toast() works from anywhere without a provider
let toasts: ToastItem[] = []
const listeners = new Set<(toasts: ToastItem[]) => void>()
let nextId = 1

function emit() {
  for (const listener of listeners) listener(toasts)
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function show(variant: ToastVariant, message: string) {
  const id = nextId++
  toasts = [...toasts, { id, variant, message }]
  emit()
  setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)
}

/** Fire-and-forget notifications — usable outside components too */
export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  info: (message: string) => show('info', message),
}

/** Hook API for components */
export function useToast() {
  return toast
}

/** Internal — used by the <Toaster /> to subscribe to the store */
export function useToasts() {
  const [list, setList] = useState<ToastItem[]>(toasts)
  useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])
  return list
}

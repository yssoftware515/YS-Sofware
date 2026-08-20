'use client'

import { useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'

function subscribeToMotionPreference(onChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getMotionPreference(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribeToMotionPreference, getMotionPreference, () => false)
}

interface AnimatedBoxProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  delay?: number
  duration?: number
  y?: number
  opacity?: number
  whileInView?: boolean
}

export function AnimatedBox({
  children, className, style,
  delay = 0, duration = 0.5, y = 16, opacity = 0,
  whileInView = false,
}: AnimatedBoxProps) {
  const reduceMotion = useReduceMotion()

  if (reduceMotion) {
    return <div className={className} style={style}>{children}</div>
  }

  const props = whileInView
    ? { initial: { opacity, y }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' as const } }
    : { initial: { opacity, y }, animate: { opacity: 1, y: 0 } }

  return (
    <motion.div {...props} transition={{ duration, delay }} className={className} style={style}>
      {children}
    </motion.div>
  )
}

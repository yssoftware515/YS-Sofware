'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/stores/theme'

const themeScript = `
(function(){
  try{
    var s=JSON.parse(localStorage.getItem('ys-theme')||'{}');
    var theme=s.state&&s.state.theme?s.state.theme:'system';
    var dark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
    if(dark)document.documentElement.classList.add('dark');
  }catch(e){}
})();
`

export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode
  nonce?: string
}) {
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, setTheme])

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} nonce={nonce} />
      {children}
    </>
  )
}

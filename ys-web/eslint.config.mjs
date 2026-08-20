import coreWebVitals from 'eslint-config-next/core-web-vitals'

// ESLint 9 flat config for Next.js 16 (eslint-config-next ships flat configs).
const eslintConfig = [
  ...coreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/**'],
  },
]

export default eslintConfig
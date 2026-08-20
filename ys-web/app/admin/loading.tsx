export default function AdminLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
      {/* Title skeleton */}
      <div style={{ width: '40%', height: 28, borderRadius: 6, backgroundColor: 'var(--color-border)' }} />

      {/* Card skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ borderRadius: 10, border: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '60%', height: 18, borderRadius: 4, backgroundColor: 'var(--color-border)' }} />
          <div style={{ width: '100%', height: 14, borderRadius: 4, backgroundColor: 'var(--color-border)' }} />
          <div style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: 'var(--color-border)' }} />
        </div>
      ))}
    </div>
  )
}

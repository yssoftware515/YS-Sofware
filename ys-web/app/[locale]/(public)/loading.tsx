export default function PublicLoading() {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <section style={{ paddingTop: '7rem', paddingBottom: '5rem', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container-site" style={{ maxWidth: '48rem' }}>
          <div style={{ width: 80, height: 14, borderRadius: 4, backgroundColor: 'var(--color-border)', marginBottom: '1rem' }} />
          <div style={{ width: '70%', height: 36, borderRadius: 8, backgroundColor: 'var(--color-border)', marginBottom: '1.5rem' }} />
          <div style={{ width: '60%', height: 18, borderRadius: 4, backgroundColor: 'var(--color-border)' }} />
        </div>
      </section>
      <section className="section-sm">
        <div className="container-site">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
                <div style={{ height: '12rem', backgroundColor: 'var(--color-background-subtle)' }} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ width: '60%', height: 18, borderRadius: 4, backgroundColor: 'var(--color-border)' }} />
                  <div style={{ width: '100%', height: 14, borderRadius: 4, backgroundColor: 'var(--color-border)' }} />
                  <div style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: 'var(--color-border)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

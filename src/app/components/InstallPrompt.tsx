import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIosSafari() {
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
  return isIos && isSafari
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)
  )
}

export default function InstallPrompt() {
  const [androidPrompt, setAndroidPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isInStandaloneMode() || dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setAndroidPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if (isIosSafari()) {
      setShowIosHint(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const handleAndroidInstall = async () => {
    if (!androidPrompt) return
    await androidPrompt.prompt()
    const { outcome } = await androidPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setAndroidPrompt(null)
      setDismissed(true)
    }
  }

  if (dismissed || isInStandaloneMode()) return null

  if (androidPrompt) {
    return (
      <div style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
        background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <img src="/pwa-192x192.png" alt="Jiffy Photos" style={{ width: 44, height: 44, borderRadius: 8 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Jiffy Photos</div>
          <div style={{ fontSize: 13, color: '#555' }}>Instala la app en tu dispositivo</div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', padding: 4 }}
          aria-label="Cerrar"
        >×</button>
        <button
          onClick={handleAndroidInstall}
          style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          Instalar
        </button>
      </div>
    )
  }

  if (showIosHint) {
    return (
      <div style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
        background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <img src="/pwa-192x192.png" alt="Jiffy Photos" style={{ width: 44, height: 44, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Añadir a pantalla de inicio</div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', padding: 4 }}
            aria-label="Cerrar"
          >×</button>
        </div>
        <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
          Toca <strong>Compartir</strong> (
          <span style={{ fontSize: 16 }}>⬆</span>
          ) y luego <strong>"Añadir a pantalla de inicio"</strong> para instalar Jiffy Photos como app.
        </div>
      </div>
    )
  }

  return null
}

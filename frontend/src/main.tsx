import { createRoot } from 'react-dom/client'
import App from './ui/App'   // ✅ default import
import AuthGuard from './ui/AuthGuard'

const container = document.getElementById('app')
if (container) {
  const root = createRoot(container)
  root.render(
    <AuthGuard>
      <App />
    </AuthGuard>
  )
}




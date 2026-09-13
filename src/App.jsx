import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import ContentPicker from './pages/ContentPicker'
import Reading from './pages/Reading'
import DiscussionSpace from './pages/DiscussionSpace'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/picker" element={<ContentPicker />} />
          <Route path="/read/:articleId" element={<Reading />} />
          <Route path="/space/:momentId" element={<DiscussionSpace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

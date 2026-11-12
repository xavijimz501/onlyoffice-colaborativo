import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import EditLogin from './pages/editLogin'
import EditDocumento from './pages/editDocumento'

function RequireSession({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<EditLogin />} />
        <Route path="/" element={<EditLogin />} />
        <Route path="/admin" element={<RequireSession><EditDocumento /></RequireSession>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

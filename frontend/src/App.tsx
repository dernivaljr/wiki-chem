import AuthProvider from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import Profile from './pages/Profile/Profile'
import { Route, Routes } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import About from './pages/About/About.tsx'
import Login from './pages/Login/Login'
import Consultas from './pages/Consultas/Consultas'
import './App.css'

function AppContent() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/consultas" element={<ProtectedRoute><Consultas /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default function App() { return <AuthProvider><AppContent /></AuthProvider> }
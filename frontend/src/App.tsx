import Cart from './commerce/Cart'
import Library from './library/Library'
import LibraryReader from './library/LibraryReader'
import Orders from './checkout/Orders'
import OrderPage from './checkout/OrderPage'
import Admin from './pages/Admin/Admin'
import AuthProvider from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import Profile from './pages/Profile/Profile'
import { Link, Route, Routes } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import About from './pages/About/About.tsx'
import Login from './pages/Login/Login'
import Consultas from './pages/Consultas/Consultas'
import MethodologyDetail from './pages/Consultas/MethodologyDetail'
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
        <Route path="/metodologias/:id" element={<ProtectedRoute><MethodologyDetail /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="ADMIN"><Admin /></ProtectedRoute>} />
        <Route path="/carrinho" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/checkout/:id" element={<ProtectedRoute><OrderPage review /></ProtectedRoute>} />
        <Route path="/pedidos" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/pedidos/:id" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
        <Route path="/biblioteca" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/biblioteca/:methodologyId" element={<ProtectedRoute><LibraryReader /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<main className="session-status"><h1>Página não encontrada</h1><p>O endereço solicitado não está disponível.</p><Link to="/">Voltar à página inicial</Link></main>} />
      </Routes>
    </>
  )
}

export default function App() { return <AuthProvider><AppContent /></AuthProvider> }

import { Route, Routes } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import About from './pages/About/About.tsx'
import Login from './pages/Login/Login'
import Consultas from './pages/Consultas/Consultas'
import './App.css'

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/consultas" element={<Consultas />} />
      </Routes>
    </>
  )
}

export default App
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import { Login } from './Components/Code/Login/Login'
import { Register } from './Components/Code/Login/Register'
import { Profile } from './Components/Code/Profile/Profile'
import { Dashboard } from './Components/Code/Dashboard/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

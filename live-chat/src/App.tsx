import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import { UserProvider } from './contexts/UserContext'
import { SocketProvider } from './contexts/SocketContext'
import { ProtectedRoute } from './Components/ProtectedRoute'
import { PublicRoute } from './Components/PublicRoute'
import { Login } from './Components/Code/Login/Login'
import { Register } from './Components/Code/Login/Register'
import { Profile } from './Components/Code/Profile/Profile'
import { Dashboard } from './Components/Code/Dashboard/Dashboard'
import { ProfileFull } from './Components/Code/Profile/Profile-full'
import { Settings } from './Components/Code/Settings/Settings'

function App() {
  return (
    <UserProvider>
      <SocketProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public Routes - redirect në dashboard nëse është logged in */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes - kërkojnë authentication */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute requireProfile={false}>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requireProfile={true}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile-full" 
            element={
              <ProtectedRoute requireProfile={true}>
                <ProfileFull />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute requireProfile={true}>
                <Settings />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all route - redirect unknown paths to login */}
          <Route 
            path="*" 
            element={<Navigate to="/login" replace />} 
          />
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </UserProvider>
  )
}

export default App

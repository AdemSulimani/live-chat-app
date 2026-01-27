import { useState } from 'react';
import './App.css'
import { Login } from './Components/Code/Login/Login'
import { Register } from './Components/Code/Login/Register'
import { Profile } from './Components/Code/Profile/Profile'

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(true); // Set to true to show Profile

  return (
    <>
      {showProfile ? (
        <Profile />
      ) : showRegister ? (
        <Register onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <Login onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </>
  )
}

export default App

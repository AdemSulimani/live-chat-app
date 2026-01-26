import { useState } from 'react';
import './App.css'
import { Login } from './Components/Code/Login/Login'
import { Register } from './Components/Code/Login/Register'

function App() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      {showRegister ? (
        <Register onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <Login onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </>
  )
}

export default App

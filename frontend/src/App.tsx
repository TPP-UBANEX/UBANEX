import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Error connecting to API'))
  }, [])

  return (
    <div>
      <h1>UBANEX</h1>
      <p>{message}</p>
    </div>
  )
}

export default App

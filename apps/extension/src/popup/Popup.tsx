import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth"
import auth from "../../shared/firebase"
import { useEffect, useState } from "react"

export default function Popup() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = async () => {
    const provider = new GoogleAuthProvider()
    console.log("Logging in with Google")
    await signInWithPopup(auth, provider)
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Loading...</div>
  }

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h3>Passwuts</h3>
        <button onClick={() => login()}>Sign in with Google</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>Welcome</h3>
      <p>{user.email}</p>
    </div>
  )
}

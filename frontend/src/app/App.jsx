
import "./App.css"
import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from "react"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

function App() {
  const editorRef = useRef(null)
  const providerRef = useRef(null)
  const bindingRef = useRef(null)

  const [username, setUsername] = useState(() =>
    new URLSearchParams(window.location.search).get("username")?.trim() || ""
  )
  const [inputUsername, setInputUsername] = useState(username)
  const [users, setUsers] = useState([])
  const [provider, setProvider] = useState(null)

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

  const handleMount = (editor) => {
  editorRef.current = editor

  if (providerRef.current) return

  const newProvider = new SocketIOProvider(
    "/",
    "monaco",
    ydoc,
    { autoConnect: true }
  )

  providerRef.current = newProvider
  setProvider(newProvider)

  const binding = new MonacoBinding(
    yText,
    editor.getModel(),
    new Set([editor]),
    newProvider.awareness
  )

  bindingRef.current = binding
}

  
useEffect(() => {
  if (!provider || !username) return

  const awareness = provider.awareness

  const updateUsers = () => {
    const states = Array.from(awareness.getStates().values())

    const connectedUsers = states
      .filter((state) => state?.user?.username)
      .map((state) => ({
        username: state.user.username,
      }))

    console.log("Awareness states:", states)
    console.log("Connected users:", connectedUsers)

    setUsers(connectedUsers)
  }

  awareness.setLocalStateField("user", {
    username: username.trim(),
  })

  awareness.on("change", updateUsers)
  updateUsers()

  return () => {
    awareness.off("change", updateUsers)
  }
}, [provider, username])


  useEffect(() => {
    return () => {
      bindingRef.current?.destroy()
      providerRef.current?.destroy()

      bindingRef.current = null
      providerRef.current = null
      editorRef.current = null
    }
  }, [])

  const handleJoin = (e) => {
    e.preventDefault()

    const name = inputUsername.trim()
    if (!name) return

    window.history.pushState(
      {},
      "",
      `?username=${encodeURIComponent(name)}`
    )

    setUsername(name)
  }

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center p-4">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input
            name="username"
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            required
          />

          <button
            type="submit"
            className="p-2 rounded-lg bg-gray-800 text-white font-bold"
          >
            Join
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-2">
      <aside className="h-full w-1/5 min-w-48 bg-amber-50 rounded-lg p-4">
        <h2 className="font-bold text-lg mb-4">
          Connected Users ({users.length})
        </h2>

        <ul className="space-y-2">
          {users.map((user, index) => (
            <li key={`${user.username}-${index}`} className="text-gray-900">
              <span className="text-green-600 mr-2">●</span>
              {user.username}
              {user.username === username ? " (You)" : ""}
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex-1 min-w-0 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultValue="// some comment"
          theme="vs-dark"
          defaultLanguage="javascript"
          onMount={handleMount}
        />
      </section>
    </main>
  )
}

export default App

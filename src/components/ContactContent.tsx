import { useState } from 'react'
import './ContactContent.css'

const CONTACT_EMAIL = 'julianlaxamana@ucla.edu'

export default function ContactContent() {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (!message.trim()) return
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      'Message from portfolio site'
    )}&body=${encodeURIComponent(message)}`
  }

  return (
    <div className="contact-content">
      <h2 className="contact-title">Send me a message!</h2>
      <textarea
        className="contact-textarea"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message here..."
        onPointerDownCapture={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        className="contact-send"
        onClick={handleSend}
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        Send
      </button>
    </div>
  )
}

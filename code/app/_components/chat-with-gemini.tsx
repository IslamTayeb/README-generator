'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Message {
  id: number
  text: string
  sender: 'user' | 'gemini'
}

export function ChatWithGemini() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! How can I assist you with your README.md?", sender: 'gemini' },
  ])

  const handleSend = () => {
    if (message.trim()) {
      const newMessage: Message = { id: messages.length + 1, text: message, sender: 'user' }
      setMessages([...messages, newMessage])
      setMessage('')

      // Simulate Gemini's response
      setTimeout(() => {
        const geminiResponse: Message = {
id: messages.length + 2,
          text: "I've received your message. How else can I help with your README?",
          sender: 'gemini'
        }
        setMessages(prev => [...prev, geminiResponse])
      }, 1000)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <h2 className="text-xl font-bold p-4 text-foreground bg-card border-b">Chat with Gemini</h2>
      <ScrollArea className="flex-grow px-4 bg-background">
        <div className="space-y-4 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                msg.sender === 'user'
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex p-4 border-t">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          className="flex-1 mr-2"
        />
        <Button onClick={handleSend}>Send</Button>
      </div>
    </div>
  )
}

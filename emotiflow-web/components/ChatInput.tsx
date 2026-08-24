'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  roomId: string
  userId: string
  currentEmotion: string
}

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000'

export default function ChatInput({ roomId, userId, currentEmotion }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    const messageText = content.trim()
    setContent('')
    setLoading(true)

    try {
      // 1. Call FastAPI HMM Microservice for emotion sequence prediction
      let predictedEmotion = currentEmotion
      let confidence = 0.85
      let sequenceData = []

      try {
        const response = await fetch(`${AI_SERVICE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: messageText,
            previous_emotion: currentEmotion
          }),
        })

        if (response.ok) {
          const aiResult = await response.json()
          predictedEmotion = aiResult.emotion
          confidence = aiResult.confidence
          sequenceData = aiResult.sequence
        }
      } catch (err) {
        console.warn('AI Microservice unreachable. Falling back to default state.', err)
      }

      // 2. Insert message into Supabase messages table
      const { error: msgError } = await supabase.from('messages').insert({
        room_id: roomId,
        user_id: userId,
        content: messageText,
        predicted_emotion: predictedEmotion,
        emotion_confidence: confidence
      })

      if (msgError) throw msgError

      // 3. Update room_emotions sequence state table
      const { error: roomError } = await supabase
        .from('room_emotions')
        .update({
          current_emotion: predictedEmotion,
          confidence: confidence,
          sequence_history: sequenceData,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', roomId)

      if (roomError) throw roomError

    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSendMessage} className="border-t border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message to analyze emotion stream..."
          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </form>
  )
}
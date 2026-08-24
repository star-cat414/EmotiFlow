'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, RoomEmotionState } from '@/types'
import DynamicEmotionBar from '@/components/DynamicEmotionBar'
import ChatInput from '@/components/ChatInput'
import { GOEMOTIONS_COLORS } from '@/lib/constants/emotions'

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const [roomId, setRoomId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [emotionState, setEmotionState] = useState<RoomEmotionState | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    params.then((p) => setRoomId(p.roomId))
  }, [params])

  useEffect(() => {
    if (!roomId) return

    async function fetchInitialData() {
      // 1. Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      // 2. Fetch existing messages
      const { data: msgData } = await supabase
        .from('messages')
        .select('*, profiles:user_id (username, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (msgData) setMessages(msgData)

      // 3. Fetch initial room emotion state
      const { data: emotionData } = await supabase
        .from('room_emotions')
        .select('*')
        .eq('room_id', roomId)
        .single()

      if (emotionData) setEmotionState(emotionData)
    }

    fetchInitialData()

    // 4. Supabase Realtime Subscription setup
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Fetch sender profile details for realtime message
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single()

          const newMessage: Message = {
            ...(payload.new as Message),
            profiles: profile || { username: 'Anonymous', avatar_url: null }
          }

          setMessages((prev) => {
            // Avoid duplicate message renders
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_emotions',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setEmotionState(payload.new as RoomEmotionState)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, supabase])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      
      {/* Top Live Emotion Bar */}
      <DynamicEmotionBar emotionState={emotionState} />

      {/* Message Stream Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.user_id === currentUserId
          const emotionStyle = GOEMOTIONS_COLORS[msg.predicted_emotion || 'neutral'] || GOEMOTIONS_COLORS['neutral']

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400">
                  {msg.profiles?.username || 'User'}
                </span>
                <span className="text-[10px] text-slate-600">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className={`max-w-md rounded-2xl px-4 py-3 text-sm shadow-md ${
                isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
              }`}>
                <p>{msg.content}</p>
                
                {msg.predicted_emotion && (
                  <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[11px]">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-bold uppercase ${emotionStyle.bg} ${emotionStyle.text}`}>
                      {msg.predicted_emotion}
                    </span>
                    <span className="opacity-70">
                      {((msg.emotion_confidence || 0) * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Action Bar */}
      {roomId && currentUserId && (
        <ChatInput 
          roomId={roomId} 
          userId={currentUserId} 
          currentEmotion={emotionState?.current_emotion || 'neutral'} 
        />
      )}

    </div>
  )
}
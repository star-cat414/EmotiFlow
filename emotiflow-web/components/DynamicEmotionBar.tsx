'use client'

import React from 'react'
import { RoomEmotionState } from '@/types'
import { GOEMOTIONS_COLORS } from '@/lib/constants/emotions'
import { Activity, ShieldAlert } from 'lucide-react'

interface DynamicEmotionBarProps {
  emotionState: RoomEmotionState | null
}

export default function DynamicEmotionBar({ emotionState }: DynamicEmotionBarProps) {
  const current = emotionState?.current_emotion || 'neutral'
  const confidence = emotionState?.confidence || 1.0
  const sequence = emotionState?.sequence_history || []

  const style = GOEMOTIONS_COLORS[current] || GOEMOTIONS_COLORS['neutral']

  return (
    <div className="border-b border-slate-800 bg-slate-900/80 px-6 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Current Active Emotion State */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-indigo-400 border border-slate-700">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Live Room State</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border ${style.bg} ${style.text} ${style.border}`}>
                {current}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Confidence Score: <strong className="text-slate-200">{(confidence * 100).toFixed(1)}%</strong>
            </p>
          </div>
        </div>

        {/* Mini Sequence History Distribution */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-slate-400 mr-2">Top Sequence Probabilities:</span>
          {sequence.slice(0, 4).map((item, idx) => {
            const itemStyle = GOEMOTIONS_COLORS[item.emotion] || GOEMOTIONS_COLORS['neutral']
            return (
              <div 
                key={idx}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs border ${itemStyle.bg} ${itemStyle.text} ${itemStyle.border}`}
                title={`${item.emotion}: ${(item.score * 100).toFixed(1)}%`}
              >
                <span className="font-medium capitalize">{item.emotion}</span>
                <span className="opacity-75">{(item.score * 100).toFixed(0)}%</span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
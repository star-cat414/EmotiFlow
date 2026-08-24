export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  predicted_emotion: string | null
  emotion_confidence: number | null
  created_at: string
  profiles?: {
    username: string
    avatar_url: string | null
  }
}

export interface EmotionScore {
  emotion: string
  score: number
}

export interface RoomEmotionState {
  room_id: string
  current_emotion: string
  confidence: number
  sequence_history: EmotionScore[]
  updated_at: string
}
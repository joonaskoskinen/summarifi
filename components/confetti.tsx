"use client"

import { useEffect, useState } from "react"

interface ConfettiProps {
  show: boolean
  onComplete?: () => void
}

export function Confetti({ show, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<
    Array<{
      id: number
      x: number
      y: number
      color: string
      rotation: number
      scale: number
      velocityX: number
      velocityY: number
    }>
  >([])

  useEffect(() => {
    if (!show) {
      setParticles([])
      return
    }

    // Luo konfetti-partikkelit
    const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"]
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      scale: Math.random() * 0.8 + 0.4,
      velocityX: (Math.random() - 0.5) * 4,
      velocityY: Math.random() * 3 + 2,
    }))

    setParticles(newParticles)

    // Poista partikkelit 3 sekunnin kuluttua
    const timer = setTimeout(() => {
      setParticles([])
      onComplete?.()
    }, 3000)

    return () => clearTimeout(timer)
  }, [show, onComplete])

  if (!show || particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 animate-bounce"
          style={{
            left: particle.x,
            top: particle.y,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animation: `confetti-fall 3s linear forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

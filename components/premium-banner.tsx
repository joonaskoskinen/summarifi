"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Crown } from "lucide-react"

interface PremiumBannerProps {
  remaining: number
  onPremiumActivated: () => void
  onClose: () => void
}

export function PremiumBanner({ remaining, onPremiumActivated, onClose }: PremiumBannerProps) {
  const [code, setCode] = useState("")
  const [isActivating, setIsActivating] = useState(false)

  const handleActivate = () => {
    if (code.toLowerCase() === "koskelo123") {
      localStorage.setItem("summari_premium", "true")
      onPremiumActivated()
    } else {
      alert("Virheellinen koodi")
    }
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">Päivitä Unlimited-tiliin</h3>
            </div>
            <p className="text-amber-700 mb-4">Olet käyttänyt kaikki {3 - remaining} ilmaista yhteenvetoa tänään.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Syötä premium-koodi"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="px-3 py-2 border border-amber-300 rounded-md"
              />
              <Button
                onClick={handleActivate}
                disabled={isActivating}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Aktivoi
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-amber-600 hover:bg-amber-100">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

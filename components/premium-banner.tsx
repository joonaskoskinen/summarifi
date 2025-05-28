"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Crown, X, Sparkles, Zap, CheckCircle, Loader2 } from "lucide-react"
import { activatePremium } from "../utils/usageTracker"
import { Confetti } from "./confetti"

interface PremiumBannerProps {
  remaining: number
  onPremiumActivated: () => void
  onClose: () => void
}

export function PremiumBanner({ remaining, onPremiumActivated, onClose }: PremiumBannerProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const handleActivate = async () => {
    if (!code.trim()) {
      setError("Syötä aktivointikoodi")
      return
    }

    setIsActivating(true)
    setError("")

    // Simuloi latausaikaa
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const success = activatePremium(code)

    if (success) {
      setShowSuccess(true)
      setShowConfetti(true)

      // Odota hetki ennen kuin kutsutaan callback
      setTimeout(() => {
        onPremiumActivated()
      }, 2000)
    } else {
      setError("Virheellinen aktivointikoodi. Tarkista koodi ja yritä uudelleen.")
    }

    setIsActivating(false)
  }

  const handleConfettiComplete = () => {
    setShowConfetti(false)
  }

  if (showSuccess) {
    return (
      <>
        <Confetti show={showConfetti} onComplete={handleConfettiComplete} />
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
              <Crown className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-4">🎉 Tervetuloa Unlimited-käyttäjäksi!</h3>
            <p className="text-green-700 mb-6">Sinulla on nyt rajaton pääsy kaikkiin Summarin ominaisuuksiin.</p>
            <div className="flex items-center justify-center gap-4 text-sm text-green-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Rajattomat yhteenvedot</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Lataa .txt-tiedostoja</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Prioriteettituki</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-xl">
      <CardHeader className="relative">
        <Button variant="ghost" size="sm" onClick={onClose} className="absolute right-2 top-2 hover:bg-amber-100">
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl text-amber-800">
              {remaining === 0 ? "Ilmaiset yhteenvedot loppuivat!" : "Päivitä Unlimited-tiliin"}
            </CardTitle>
            <CardDescription className="text-amber-700">
              {remaining === 0
                ? "Aktivoi Unlimited-koodi tai osta tilaus jatkaaksesi"
                : `${remaining} ilmaista yhteenvetoa jäljellä tänään`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Unlimited Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-amber-200">
            <Zap className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Rajattomat yhteenvedot</p>
              <p className="text-amber-600 text-xs">Ei päivittäisiä rajoja</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-amber-200">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Premium-ominaisuudet</p>
              <p className="text-amber-600 text-xs">Lataukset & jakaminen</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-amber-200">
            <Crown className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Prioriteettituki</p>
              <p className="text-amber-600 text-xs">Nopea asiakaspalvelu</p>
            </div>
          </div>
        </div>

        {/* Activation Code Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-2">Aktivointikoodi:</label>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Syötä Unlimited-koodi..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 border-amber-300 focus:border-amber-500"
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              />
              <Button
                onClick={handleActivate}
                disabled={isActivating || !code.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aktivoidaan...
                  </>
                ) : (
                  "Aktivoi"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <p className="text-sm text-amber-700 mb-3">Ei koodia? Hanki Unlimited-tilaus:</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

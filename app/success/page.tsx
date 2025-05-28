"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, CheckCircle, ArrowRight, Loader2 } from "lucide-react"
import { verifyPayment } from "../actions/stripe"
import { activatePremiumWithCustomer } from "../../utils/usageTracker"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [isVerifying, setIsVerifying] = useState(true)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    const verifyAndActivate = async () => {
      if (!sessionId) {
        setIsVerifying(false)
        return
      }

      try {
        const { success, customerId } = await verifyPayment(sessionId)

        if (success && customerId) {
          activatePremiumWithCustomer(customerId)
          setIsVerified(true)
        }
      } catch (error) {
        console.error("Verification failed:", error)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyAndActivate()
  }, [sessionId])

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Vahvistetaan maksua...</h2>
            <p className="text-gray-600">Odota hetki, käsittelemme tilauksen.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            {isVerified ? <CheckCircle className="h-10 w-10 text-white" /> : <Crown className="h-10 w-10 text-white" />}
          </div>
          <CardTitle className="text-3xl font-bold text-green-800">
            {isVerified ? "🎉 Tervetuloa Unlimited-käyttäjäksi!" : "Kiitos tilauksesta!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-4">
            <p className="text-lg text-gray-700">
              {isVerified
                ? "Summari Unlimited on nyt aktivoitu! Voit käyttää kaikkia ominaisuuksia rajattomasti."
                : "Tilauksen käsittely on käynnissä. Saat vahvistuksen sähköpostiin hetken kuluttua."}
            </p>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Unlimited-ominaisuudet nyt käytössä:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ Rajaton määrä yhteenvetoja</li>
                <li>✅ Edistynyt analyysi ja kategoriointi</li>
                <li>✅ Lataa tiivistelmät .txt-tiedostona</li>
                <li>✅ Käyttötilastot ja trendit</li>
                <li>✅ Yhteenvetojen historia ja haku</li>
                <li>✅ Prioriteettituki 24/7</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <a href="/">
                <ArrowRight className="h-4 w-4 mr-2" />
                Aloita käyttö
              </a>
            </Button>
          </div>

          <div className="text-sm text-gray-500 border-t pt-4">
            <p>💰 30 päivän rahat takaisin -takuu</p>
            <p>📧 Saat laskun ja tilausvahvistuksen sähköpostiin</p>
            <p>🔧 Voit hallita tilausta Stripe-portaalissa</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

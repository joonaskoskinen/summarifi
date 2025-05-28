'use client';

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Mail,
  Sparkles,
  Crown,
  Lock,
  Check,
  Zap,
  ArrowRight,
  Target,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  Bot,
  Wand2,
  CheckCircle,
  Rocket,
  Shield,
  Brain,
  MessageSquare,
  FileText,
  X,
  Users,
  Globe,
  Lightbulb,
} from "lucide-react"
import { generateSummary, type SummaryResult } from "./actions/summarize"
import { createCheckoutSession } from "./actions/stripe"
import { getUsageData, incrementUsage, canUseService } from "../utils/usageTracker"
import { PremiumBanner } from "@/components/premium-banner"

const downloadSummary = (summary: SummaryResult, usageData: any) => {
  if (!usageData.isPremium) return

  const timestamp = new Date().toLocaleString("fi-FI")
  const contentTypeMap = {
    meeting: "Kokousmuistio",
    email: "Sähköposti",
    document: "Dokumentti",
    general: "Yleinen teksti",
  }

  let content = `SUMMARI UNLIMITED - YHTEENVETO\n`
  content += `Luotu: ${timestamp}\n`
  content += `Tyyppi: ${contentTypeMap[summary.contentType as keyof typeof contentTypeMap] || "Tuntematon"}\n`
  content += `${"=".repeat(50)}\n\n`

  content += `TIIVISTELMÄ:\n${summary.summary}\n\n`

  content += `PÄÄKOHDAT:\n`
  summary.keyPoints.forEach((point, i) => {
    content += `${i + 1}. ${point}\n`
  })
  content += `\n`

  content += `TODO-TEHTÄVÄT:\n`
  summary.actionItems.forEach((action, i) => {
    content += `☐ ${action}\n`
  })
  content += `\n`

  if (summary.deadlines && summary.deadlines.length > 0) {
    content += `DEADLINET:\n`
    summary.deadlines.forEach((deadline) => {
      content += `📅 ${deadline.deadline} - ${deadline.task} (${deadline.person})\n`
    })
    content += `\n`
  }

  if (summary.pendingDecisions && summary.pendingDecisions.length > 0) {
    content += `AVOIMET PÄÄTÖKSET:\n`
    summary.pendingDecisions.forEach((decision) => {
      content += `❓ ${decision}\n`
    })
    content += `\n`
  }

  if (summary.responseTemplate) {
    content += `VASTAUSLUONNOS:\n${summary.responseTemplate}\n\n`
  }

  content += `${"=".repeat(50)}\n`
  content += `Luotu Summari Unlimited -palvelulla\n`
  content += `summari.fi\n`

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `summari-yhteenveto-${new Date().toISOString().split("T")[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function SummariApp() {
  const [content, setContent] = useState("")
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [usageData, setUsageData] = useState(getUsageData())
  const [showPremiumBanner, setShowPremiumBanner] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<"auto" | "meeting" | "email" | "project">("auto")
  const [liveAnalysis, setLiveAnalysis] = useState({ wordCount: 0, estimatedTime: 0, detectedElements: [] as string[] })

  useEffect(() => {
    setUsageData(getUsageData())
  }, [])

  const scrollToApp = () => {
    const appSection = document.getElementById("app-section")
    if (appSection) {
      appSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      // Fokusoi textarea hetken kuluttua
      setTimeout(() => {
        const textarea = document.querySelector("textarea")
        if (textarea) {
          textarea.focus()
        }
      }, 800)
    }
  }

  const handleSubmit = async () => {
    if (!content?.trim()) return

    const { allowed, remaining } = canUseService()

    if (!allowed && !usageData.isPremium) {
      setShowPremiumBanner(true)
      return
    }

    setIsLoading(true)
    try {
      // Käytä valittua templatea
      const summary = await generateSummary(content, selectedTemplate)
      setResult(summary)

      if (!usageData.isPremium) {
        const newUsageData = incrementUsage()
        setUsageData(newUsageData)
      }
    } catch (error) {
      console.error("Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Tuntematon virhe"
      setResult({
        summary: `Virhe yhteenvedon luomisessa: ${errorMessage}`,
        keyPoints: ["Kokeile lyhentää tekstiä", "Varmista että teksti on selkeää suomea"],
        actionItems: ["Muokkaa tekstiä ja yritä uudelleen"],
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const words = content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
    const estimatedTime = Math.max(3, Math.ceil(words / 100)) // ~100 sanaa sekunnissa

    const detectedElements = []
    if (content.toLowerCase().includes("todo") || content.toLowerCase().includes("tehtävä")) {
      detectedElements.push("TODO-tehtäviä")
    }
    if (content.toLowerCase().includes("deadline") || content.toLowerCase().includes("mennessä")) {
      detectedElements.push("Deadlineja")
    }
    if (content.toLowerCase().includes("päätös") || content.toLowerCase().includes("sovittiin")) {
      detectedElements.push("Päätöksiä")
    }
    if (content.toLowerCase().includes("@") || content.toLowerCase().includes("lähettäjä")) {
      detectedElements.push("Sähköposti")
    }
    if (content.toLowerCase().includes("kokous") || content.toLowerCase().includes("osallistuj")) {
      detectedElements.push("Kokousmuistio")
    }

    setLiveAnalysis({ wordCount: words, estimatedTime, detectedElements })
  }, [content])

  const handlePremiumPurchase = async () => {
    setIsProcessingPayment(true)
    try {
      const { url, error } = await createCheckoutSession()

      if (error) {
        alert(`❌ ${error}`)
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      alert("❌ Maksu epäonnistui. Yritä uudelleen.")
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handlePremiumActivated = () => {
    setUsageData(getUsageData())
    setShowPremiumBanner(false)
    setShowPricing(false)
  }

  const { allowed, remaining } = canUseService()

  const exampleText = `Hei, tässä olisi nyt vähän pidempää raporttia meidän viimeviikkoisesta markkinointikokouksesta, jota venytettiin muuten lopulta 1,5 tuntia, koska osalla oli niin paljon kommentoitavaa.

Ensinnäkin puhuttiin siitä, että meidän nykyinen mainoskampanja ei ole tuottanut toivottuja tuloksia, erityisesti LinkedInin kautta tulleet liidit ovat olleet vähäisiä ja niissä konversioaste matala, joten siihen pitäisi ehkä tehdä jotain uudelleen kohdistusta tai ainakin miettiä viestien selkeyttämistä. Samalla nousi esiin, että tiimillä ei ole vielä kunnollista yleisösegmentointia käytössä, mikä osaltaan selittää, miksi viestit eivät ehkä resonoi oikein – tästä pyydettiin Jenniä tekemään alustava suunnitelma seuraavaan kokoukseen mennessä.

Sitten siirryttiin puhumaan somekanavien aktiivisuudesta. On kuulemma paljon hajontaa siinä, kuka milloin julkaisee mitäkin, eikä ole selkeää aikataulua tai linjaa, joten päätettiin kokeilla 2 viikon sisällä uutta julkaisukalenteria, joka jaetaan kaikille Slackissa. Kukaan ei tosin vielä ottanut vastuuta sen laatimisesta, mutta Timo lupasi kysyä Lottaa, ehtisikö hän.

Myös verkkosivujen analytiikka otettiin esille – siellä näkyi piikki viime viikolla, mahdollisesti uuden blogitekstin ansiosta, mutta ei vielä varmaa. Joku ehdotti, että lisätään UTM-tageja kaikkiin linkkeihin, että tiedetään, mistä liikenne tarkalleen tulee. Jatkopäätös: Julia katsoo analytiikan asetukset kuntoon ennen torstaita.

Loppupuolella vielä käytiin läpi ensi kuun webinaarin valmistelua. Ilmoittautumisia on tullut toistaiseksi vähän, vaikka markkinointia on tehty – ehkä kutsut ei ole menneet oikeille ihmisille? Sovittiin, että testataan eri otsikoita A/B-testillä sähköposteissa, ja tämä hoidetaan Mailchimpin kautta.

Viimeinen keskustelu käytiin budjetista. Kaikki toimet näyttäisivät pysyvän raameissa, mutta Mari nosti esiin, että jos halutaan lisää mainosrahaa seuraavaan kampanjaan, niin siitä pitää nyt tehdä esitys talouspuolelle, ja mieluiten jo ennen kuun vaihdetta.

Seuraava kokous on ensi viikon keskiviikkona klo 13:00.`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="relative z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Summari
              </h1>
              {usageData.isPremium && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  Unlimited
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              {!usageData.isPremium && (
                <Button
                  onClick={() => setShowPricing(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Päivitä Unlimited
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5" />
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo/Badge area */}
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-blue-200/50">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Älykkäät yhteenvedot suomeksi</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
              Muuta pitkät tekstit
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                toimintasuunnitelmiksi
              </span>
            </h1>

            <p className="text-xl lg:text-2xl text-gray-600 mb-12 leading-relaxed">
              AI tunnistaa automaattisesti pääkohdat, TODO-tehtävät ja deadlinet.
              <br className="hidden lg:block" />
              Säästä tunteja viikossa älykkäällä tiivistämisellä.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
                onClick={scrollToApp}
              >
                <Rocket className="h-5 w-5 mr-2" />
                Kokeile ilmaiseksi
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm">3 ilmaista yhteenvetoa päivässä</span>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-8 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Beta-vaihe</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Suomalainen startup</span>
              </div>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span>AI-teknologia</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl relative shadow-3xl border-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPricing(false)}
              className="absolute right-4 top-4 z-10 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </Button>

            <CardHeader className="text-center pb-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Summari Unlimited
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 mt-4">
                Avaa kaikki ominaisuudet ja tee työstäsi tehokkaampaa
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8 p-8">
              {/* Pricing */}
              <div className="text-center">
                <div className="inline-flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-black text-gray-900">19€</span>
                  <span className="text-xl text-gray-600">/kuukausi</span>
                </div>
                <p className="text-gray-600">Ei sitoutumista • Peruuta milloin vain</p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                {[
                  "🚀 Rajaton määrä yhteenvetoja",
                  "📊 Edistynyt analyysi ja kategoriointi",
                  "💾 Lataa tiivistelmät .txt-tiedostona",
                  "📈 Käyttötilastot ja trendit",
                  "🎯 Prioriteettituki 24/7",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-semibold shadow-xl"
                onClick={handlePremiumPurchase}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Käsitellään...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Aloita Unlimited-tilaus
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowPremiumBanner(true)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Minulla on jo Unlimited-koodi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Premium Banner */}
      {showPremiumBanner && (
        <div className="container mx-auto px-4 mb-8">
          <PremiumBanner
            remaining={remaining}
            onPremiumActivated={handlePremiumActivated}
            onClose={() => setShowPremiumBanner(false)}
          />
        </div>
      )}

      {/* Usage indicator */}
      {!usageData.isPremium && remaining > 0 && (
        <div className="container mx-auto px-4 mb-8">
          <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <Zap className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 flex items-center justify-between">
              <span>
                <strong>{remaining} ilmaista yhteenvetoa</strong> jäljellä tänään.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPricing(true)}
                className="ml-4 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Päivitä Unlimited
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main App Section */}
      <div id="app-section" className="container mx-auto px-4 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
                Syötä sisältö
              </CardTitle>
              <CardDescription className="text-gray-600">
                Liitä sähköposti, kokousmuistio tai mikä tahansa teksti. AI analysoi sisällön automaattisesti.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-600" />
                  Valitse analyysityyppi:
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { id: "auto", label: "🤖 Automaattinen", desc: "AI tunnistaa tyypin" },
                    { id: "meeting", label: "🏢 Kokous", desc: "Päätökset & toimet" },
                    { id: "email", label: "📧 Sähköposti", desc: "Vastaus & TODO:t" },
                    { id: "project", label: "📋 Projekti", desc: "Timeline & vastuut" },
                  ].map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id as any)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedTemplate === template.id
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-sm font-medium">{template.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{template.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  Kirjoita tai liitä teksti:
                </label>
                <Textarea
                  placeholder="Liitä tai kirjoita teksti tähän...

AI tunnistaa automaattisesti:
• Sähköpostit
• Kokousmuistiot  
• Dokumentit
• Yleinen teksti

Ja poimii pääkohdat, TODO:t ja deadlinet."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] resize-none border-2 border-gray-200 focus:border-blue-400 rounded-lg text-sm p-4"
                />
              </div>
              {content && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{liveAnalysis.wordCount} sanaa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">~{liveAnalysis.estimatedTime}s</span>
                    </div>
                  </div>
                  {liveAnalysis.detectedElements.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-600 mr-2">Tunnistettu:</span>
                      {liveAnalysis.detectedElements.map((element, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          {element}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setContent(exampleText)}
                className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Käytä esimerkkiä
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!content?.trim() || isLoading || (!allowed && !usageData.isPremium)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-semibold shadow-lg"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    AI analysoi...
                  </>
                ) : !allowed && !usageData.isPremium ? (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Päivitä Unlimited:iin
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 mr-2" />
                    Analysoi automaattisesti
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                AI-analyysi
                {result?.contentType && (
                  <Badge variant="secondary" className="ml-2">
                    {result.contentType === "meeting"
                      ? "🏢 Kokous"
                      : result.contentType === "email"
                        ? "📧 Sähköposti"
                        : result.contentType === "document"
                          ? "📄 Dokumentti"
                          : "📝 Yleinen"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Automaattisesti tunnistettu sisältötyyppi ja analyysi
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {!result ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                    <Bot className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-700">Valmis analysoimaan!</h3>
                  <p className="text-gray-600">Syötä teksti vasemmalle ja klikkaa "Analysoi automaattisesti"</p>
                </div>
              ) : (
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="summary" className="text-xs">
                      📋 Tiivistelmä
                    </TabsTrigger>
                    <TabsTrigger value="points" className="text-xs">
                      🎯 Pääkohdat
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="text-xs">
                      ✅ TODO:t
                    </TabsTrigger>
                    <TabsTrigger value="deadlines" className="text-xs">
                      📅 Deadlinet
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          Tiivistelmä
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <p className="text-gray-700 leading-relaxed">
                            {result?.summary || "Ei tiivistelmää saatavilla"}
                          </p>
                        </div>
                      </div>

                      {result?.pendingDecisions && result.pendingDecisions.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Avoimet päätökset
                          </h3>
                          <div className="space-y-2">
                            {result.pendingDecisions.map((decision, index) => (
                              <div key={index} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                <p className="text-orange-800 text-sm">{decision}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result?.responseTemplate && (
                        <div>
                          <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                            <Mail className="h-5 w-5 text-green-600" />
                            Vastausluonnos
                          </h3>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="text-gray-700 whitespace-pre-line text-sm">{result.responseTemplate}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 pt-4 border-t space-y-3">
                      <Button
                        variant="outline"
                        onClick={() => downloadSummary(result, usageData)}
                        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                        disabled={!usageData.isPremium}
                      >
                        {usageData.isPremium ? (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Lataa .txt-tiedostona
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Lataus vaatii Unlimited-tilauksen
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="points" className="mt-6">
                    <div>
                      <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Pääkohdat
                      </h3>
                      <ul className="space-y-3">
                        {(result?.keyPoints || []).map((point, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 bg-purple-50 p-4 rounded-lg border border-purple-200"
                          >
                            <Badge variant="secondary" className="mt-0.5 text-xs bg-purple-100 text-purple-700">
                              {index + 1}
                            </Badge>
                            <span className="text-gray-700 flex-1 text-sm leading-relaxed">
                              {point || "Ei sisältöä"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="actions" className="mt-6">
                    <div>
                      <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        TODO-tehtävät
                      </h3>
                      <ul className="space-y-3">
                        {(result?.actionItems || []).map((action, index) => {
                          // Yksinkertainen prioriteetti-analyysi
                          const isUrgent =
                            action.toLowerCase().includes("kiireellinen") ||
                            action.toLowerCase().includes("heti") ||
                            action.toLowerCase().includes("asap")
                          const isImportant =
                            action.toLowerCase().includes("tärkeä") || action.toLowerCase().includes("kriittinen")

                          const priority = isUrgent ? "high" : isImportant ? "medium" : "low"
                          const priorityConfig = {
                            high: { icon: "🔥", label: "Kiireellinen", color: "red" },
                            medium: { icon: "⚡", label: "Tärkeä", color: "orange" },
                            low: { icon: "📝", label: "Normaali", color: "green" },
                          }

                          const config = priorityConfig[priority]

                          return (
                            <li
                              key={index}
                              className={`flex items-start gap-3 p-4 rounded-lg border ${
                                priority === "high"
                                  ? "bg-red-50 border-red-200"
                                  : priority === "medium"
                                    ? "bg-orange-50 border-orange-200"
                                    : "bg-green-50 border-green-200"
                              }`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-lg">{config.icon}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs border-${config.color}-300 text-${config.color}-700`}
                                >
                                  {config.label}
                                </Badge>
                              </div>
                              <span className="text-gray-700 flex-1 text-sm leading-relaxed">
                                {action || "Ei toimenpidettä"}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="deadlines" className="mt-6">
                    <div>
                      <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-red-600" />
                        Deadlinet ja vastuuhenkilöt
                      </h3>
                      {result?.deadlines && result.deadlines.length > 0 ? (
                        <div className="space-y-3">
                          {result.deadlines
                            .sort((a, b) => {
                              const priorityOrder = { high: 3, medium: 2, low: 1 }
                              return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2)
                            })
                            .map((deadline, index) => {
                              const priorityConfig = {
                                high: { icon: "🔥", label: "Kiireellinen", color: "red" },
                                medium: { icon: "⚡", label: "Tärkeä", color: "orange" },
                                low: { icon: "📝", label: "Normaali", color: "blue" },
                              }

                              const config = priorityConfig[deadline.priority] || priorityConfig.medium

                              return (
                                <div
                                  key={index}
                                  className={`p-4 rounded-lg border ${
                                    deadline.priority === "high"
                                      ? "bg-red-50 border-red-200"
                                      : deadline.priority === "medium"
                                        ? "bg-orange-50 border-orange-200"
                                        : "bg-blue-50 border-blue-200"
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="font-semibold text-gray-900 text-sm flex-1">{deadline.task}</p>
                                    <div className="flex items-center gap-1 ml-2">
                                      <span className="text-sm">{config.icon}</span>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs border-${config.color}-300 text-${config.color}-700`}
                                      >
                                        {config.label}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-gray-700 text-xs">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{deadline.person}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span className="font-medium">DDL: {deadline.deadline}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Ei deadlineja tunnistettu</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-24 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Ei enää turhaa promptailua tekoälyn kanssa</h2>
          <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
            Summari tekee sen minkä muut AI-työkalut eivät osaa - ymmärtää suomalaista työkulttuuria
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-left shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <X className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">❌ Muut AI-työkalut</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm">
                  "Analysoi tämä kokousmuistio ja..." *kirjoittaa 200 sanan promptin*
                  <br />
                  <br />
                  Vastaus: "Tässä on analyysi englanniksi..."
                </p>
              </CardContent>
            </Card>

            <Card className="text-left shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">✅ Summari</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm">
                  *Liitä teksti* → *Klikkaa nappia*
                  <br />
                  <br />
                  Valmis! TODO:t, deadlinet ja vastuuhenkilöt suomeksi. Ei promptailua.
                </p>
              </CardContent>
            </Card>

            <Card className="text-left shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">🚀 Tulos</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm">
                  <span className="font-semibold text-green-600">5 minuuttia → 10 sekuntia</span>
                  <br />
                  <br />
                  Suoraan käyttöön, ei säätämistä. Toimii suomeksi, ymmärtää kontekstin.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

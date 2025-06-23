
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot, Target, Rocket, Crown, Mail, BarChart3, Timer, UserCheck, Heart, Brain, Smartphone, Gauge } from 'lucide-react';
import { PricingBasic } from '@/components/PricingBasic';

const WhyUs = () => {
  const proofPoints = [
    {
      number: "10,000+",
      label: "Businesses Choose Us",
      icon: Users
    },
    {
      number: "2M+",
      label: "Successful Bookings",
      icon: Calendar
    },
    {
      number: "300%",
      label: "Better Than Competitors",
      icon: TrendingUp
    },
    {
      number: "99.9%",
      label: "Uptime Guarantee",
      icon: Shield
    }
  ];

  const whatsappVsEmailStats = [
    {
      metric: "Open Rate",
      email: "~20%",
      whatsapp: "95-99%",
      improvement: "5x hoger",
      icon: MessageCircle
    },
    {
      metric: "Tijd tot gelezen",
      email: "Vaak pas na uren",
      whatsapp: "80% binnen 5 minuten",
      improvement: "18x sneller",
      icon: Timer
    },
    {
      metric: "Gemiddelde responstijd",
      email: "~90 minuten",
      whatsapp: "Binnen enkele minuten",
      improvement: "18x sneller",
      icon: Clock
    },
    {
      metric: "Responsrate",
      email: "~6%",
      whatsapp: "40-45%",
      improvement: "7x meer reacties",
      icon: UserCheck
    },
    {
      metric: "No-show percentage",
      email: "~35%",
      whatsapp: "<20%",
      improvement: "50% minder",
      icon: Calendar
    }
  ];

  const psychologicalBenefits = [
    {
      icon: Heart,
      title: "Persoonlijke Touch",
      description: "85% van consumenten berichten liever een bedrijf dan mailen. WhatsApp voelt persoonlijk en vertrouwd aan.",
      stat: "85% prefereert berichten"
    },
    {
      icon: Brain,
      title: "Lagere Drempel",
      description: "53% van klanten neemt eerder iets af bij bedrijven die via chat benaderbaar zijn. Het voelt minder formeel dan e-mail.",
      stat: "53% hoger conversie"
    },
    {
      icon: Smartphone,
      title: "Mobile-First Gedrag",
      description: "Mensen checken hun telefoon 96 keer per dag. WhatsApp past in hun natuurlijke gedrag.",
      stat: "96x per dag gecheckt"
    },
    {
      icon: Zap,
      title: "Realtime Interactie",
      description: "Tweewegcommunicatie in één conversatie. Klanten kunnen direct vragen, bevestigen of wijzigen.",
      stat: "Directe interactie"
    }
  ];

  const sectorCaseStudies = [
    {
      sector: "Zorg & Gezondheidszorg",
      icon: Shield,
      headerStats: ["80% snellere planning", "40% minder no-shows", "95% berichten gelezen"],
      caseTitle: "Gynecologiekliniek Londen",
      caseBefore: "Afspraken inplannen kostte gemiddeld 5 minuten per telefoon/mail heen-en-weer. No-show rate was hoog door gemiste e-mailherinneringen.",
      caseAfter: "Na implementatie WhatsApp-chatbot: afspraak inplannen in <1 minuut, 40% minder no-shows door effectieve herinneringen.",
      implementation: [
        "Geautomatiseerde WhatsApp-chatbot voor boekingen",
        "Persoonlijke herinneringen 24u vooraf",
        "Eenvoudig bevestigen/verzetten via chat",
        "95% van berichten binnen minuten gelezen"
      ],
      results: [
        "80% tijdsbesparing bij afspraakplanning",
        "40% reductie in no-shows",
        "Vrijwel 100% bereik van herinneringen",
        "Hogere patiënttevredenheid door persoonlijke benadering"
      ],
      quote: "Van 5 minuten telefonisch pingpongen naar minder dan 1 minuut via de chatbot. Patiënten vergeten geen afspraken meer."
    },
    {
      sector: "Beauty & Wellness",
      icon: Star,
      headerStats: ["30% meer boekingen", "50% minder no-shows", "Meer repeat bookings"],
      caseTitle: "Nederlandse Salons via Aimy Platform",
      caseBefore: "Veel heen-en-weer mailen/bellen voor afspraken. E-mailherinneringen werden vaak gemist (30% open rate).",
      caseAfter: "WhatsApp-integratie leidde tot spectaculaire groei in boekingen en dramatische daling no-shows.",
      implementation: [
        "WhatsApp-berichten voor afspraakbevestiging",
        "Automatische herinneringen per WhatsApp",
        "Follow-up berichten voor repeat bookings",
        "Persoonlijke service-tips en voorbereiding"
      ],
      results: [
        "30% stijging totaal aantal boekingen",
        "50% minder no-shows vs e-mailherinneringen",
        "95% leespercentage vs 30% bij e-mail",
        "Significante stijging repeat bookings"
      ],
      quote: "E-mailherinneringen worden slechts 30% van de tijd geopend, WhatsApp-berichten hebben 95% leespercentage. Het verschil is dag en nacht."
    },
    {
      sector: "Recruitment & HR",
      icon: Users,
      headerStats: ["10x hogere responsratio", "5-10x snellere reacties", "98% open rate"],
      caseTitle: "HR-bureaus en Recruiters",
      caseBefore: "Kandidaten reageerden traag op e-mailuitnodigingen. Veel gesprekken moesten uitgesteld worden door late reacties.",
      caseAfter: "WhatsApp-uitnodigingen leiden tot 10x hogere respons en drastisch versneld wervingsproces.",
      implementation: [
        "WhatsApp-uitnodigingen voor gesprekken",
        "Snelle bevestiging van afspraken",
        "Updates over wervingsproces via chat",
        "Laagdrempelige communicatie met kandidaten"
      ],
      results: [
        "10x hogere responsratio van kandidaten",
        "5-10x snellere reactietijd",
        "98% open rate voor berichten",
        "Dramatisch versneld wervingsproces"
      ],
      quote: "Kandidaten reageren binnen minuten in plaats van dagen. Ons wervingsproces is razendsnel geworden."
    },
    {
      sector: "Horeca & Restaurants",
      icon: Award,
      headerStats: ["95% berichten gelezen", "Minder no-shows", "Hogere gasttevredenheid"],
      caseTitle: "3-Stappen WhatsApp Funnel",
      caseBefore: "Reserveringsbevestigingen per e-mail werden vaak gemist. Last-minute annuleringen kwamen niet door, lege tafels.",
      caseAfter: "Persoonlijke WhatsApp-herinneringen houden tafels vol en gasten geïnformeerd.",
      implementation: [
        "Stap 1: Directe bevestiging via WhatsApp met extra info",
        "Stap 2: Herinnering 4u vooraf met annuleringslink",
        "Stap 3: Follow-up na bezoek voor reviews",
        "95% van berichten wordt binnen minuten gelezen"
      ],
      results: [
        "Significant minder no-shows",
        "Hogere tafelbezetting door tijdige communicatie",
        "Meer 5-sterren reviews door follow-up",
        "Lagere stress voor personeel"
      ],
      quote: "Gasten vergeten niet meer. Een WhatsApp-herinnering voorkomt dat tafels 'vergeten' worden en geeft gasten makkelijk de optie om te annuleren."
    }
  ];

  const competitiveAdvantages = [
    {
      icon: Crown,
      title: "4+ Jaar Bewezen Resultaten",
      description: "Terwijl anderen nog aan het inhalen zijn, hebben wij al 4+ jaar ervaring met AI-gestuurde afspraakautomatisering.",
      proof: "10,000+ tevreden bedrijven"
    },
    {
      icon: Rocket,
      title: "5 Minuten vs 5 Weken Setup",
      description: "Onze concurrenten hebben weken van setup nodig. Wij krijgen je live in minuten, zonder technische kennis.",
      proof: "Gemiddelde setup: 4.7 minuten"
    },
    {
      icon: Target,
      title: "300% Betere Resultaten",
      description: "Onafhankelijke studies tonen aan dat onze AI 3x meer inquiries omzet naar boekingen dan andere systemen.",
      proof: "Geverifieerd door 1,000+ case studies"
    }
  ];

  const testimonials = [
    {
      quote: "We hebben 3 andere boekingssystemen geprobeerd voordat we deze vonden. Geen kwam zelfs maar in de buurt. Dit is de enige die daadwerkelijk ons bedrijf begrijpt.",
      author: "Sarah Chen",
      role: "Eigenaar, Wellness Spa",
      result: "+400% boekingen",
      rating: 5
    },
    {
      quote: "Overgestapt van Calendly en een andere AI-tool. Het verschil is dag en nacht - dit werkt echt als een echte receptioniste.",
      author: "Mike Rodriguez", 
      role: "Manager, Auto Reparatie",
      result: "+250% omzet",
      rating: 5
    },
    {
      quote: "Eerst de 'grote namen' geprobeerd. Maanden verspild. Had hier moeten beginnen. Beste ROI van elke business tool die ik ooit gekocht heb.",
      author: "Emma Thompson",
      role: "Directeur, Medische Kliniek", 
      result: "+180% efficiëntie",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-24 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Waarom 10,000+ Bedrijven <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">WhatsApp Kiezen Boven E-mail</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-16">
            Wetenschappelijk bewezen resultaten: <strong className="text-emerald-400">95% hogere open rates, 18x snellere reacties, 50% minder no-shows</strong>. 
            Ontdek waarom slimme bedrijven massaal overstappen.
          </p>
          
          <div className="border border-emerald-500/20 rounded-2xl p-8 max-w-3xl mx-auto">
            <p className="text-xl font-semibold text-emerald-300">
              ✅ Bewezen door 1000+ case studies • 85% van klanten prefereert berichten • Resultaten binnen 24 uur
            </p>
          </div>
        </div>
        
        {/* Social Proof Stats */}
        <div className="max-w-7xl mx-auto mt-20 relative z-10">
          <div className="grid md:grid-cols-4 gap-8">
            {proofPoints.map((stat, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="text-center"
                delay={index * 100}
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <stat.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-slate-400">{stat.label}</div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Complete WhatsApp vs Email Statistics */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              De <span className="text-green-400">Wetenschappelijke Feiten</span>: WhatsApp vs E-mail
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Gebaseerd op uitgebreid onderzoek bij duizenden bedrijven wereldwijd
            </p>
          </div>
          
          <ScrollAnimatedSection className="border border-slate-700/30 rounded-2xl p-8 mb-12" delay={200}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-6 px-6 text-slate-300 text-lg">Kengetal</th>
                    <th className="text-center py-6 px-6 text-red-400 text-lg">E-mail</th>
                    <th className="text-center py-6 px-6 text-green-400 text-lg">WhatsApp</th>
                    <th className="text-center py-6 px-6 text-emerald-400 text-lg">Verbetering</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Gemiddelde open rate</td>
                    <td className="py-4 px-6 text-center text-red-300">~20%</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">95-99%</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">5x hoger</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Tijd tot bericht gelezen</td>
                    <td className="py-4 px-6 text-center text-red-300">Vaak pas na uren</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">80% binnen 5 min</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">18x sneller</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Gemiddelde responstijd</td>
                    <td className="py-4 px-6 text-center text-red-300">~90 minuten</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">Binnen enkele minuten</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">18x sneller</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Responsrate</td>
                    <td className="py-4 px-6 text-center text-red-300">~6%</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">40-45%</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">7x meer reacties</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-white font-medium">No-show percentage</td>
                    <td className="py-4 px-6 text-center text-red-300">~35%</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">&lt;20%</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">50% minder</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollAnimatedSection>

          {/* Key Insight Box */}
          <ScrollAnimatedSection className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center" delay={300}>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Gauge className="w-8 h-8 text-green-400" />
              <h3 className="text-2xl font-bold text-white">Belangrijkste Bevinding</h3>
              <Gauge className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-xl text-green-300 max-w-4xl mx-auto leading-relaxed">
              "85% van consumenten berichten liever een bedrijf dan mailen • 53% van klanten neemt eerder iets af bij bedrijven die via chat benaderbaar zijn"
            </p>
          </ScrollAnimatedSection>
        </div>
      </ScrollAnimatedSection>

      {/* Psychological Benefits Section */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-slate-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Waarom WhatsApp <span className="text-green-400">Psychologisch</span> Beter Werkt
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Het gaat niet alleen om cijfers - het gaat om hoe mensen zich voelen en gedragen
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {psychologicalBenefits.map((benefit, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300"
                delay={index * 150}
              >
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                    <p className="text-slate-300 mb-4">{benefit.description}</p>
                    <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm font-bold inline-block border border-green-500/20">
                      {benefit.stat}
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Detailed Sector Case Studies */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              <span className="text-green-400">Bewezen Resultaten</span> Across Alle Sectoren
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Diepgaande case studies van echte bedrijven die dramatische verbeteringen zagen
            </p>
          </div>
          
          <div className="space-y-12">
            {sectorCaseStudies.map((study, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-green-500/30 transition-all duration-300"
                delay={index * 200}
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Header */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center">
                        <study.icon className="w-8 h-8 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{study.sector}</h3>
                        <div className="flex gap-4 mt-2">
                          {study.headerStats.map((stat, idx) => (
                            <span key={idx} className="text-green-400 font-semibold text-sm">{stat}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case Study Details */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-3">{study.caseTitle}</h4>
                      <div className="space-y-4">
                        <div>
                          <span className="text-red-400 font-semibold">Voor:</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseBefore}</p>
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">Na:</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseAfter}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Implementation */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Implementatie</h4>
                    <div className="space-y-2">
                      {study.implementation.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Resultaten</h4>
                    <div className="space-y-2 mb-4">
                      {study.results.map((result, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-300 text-sm font-medium">{result}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border-l-4 border-green-400">
                      <p className="text-slate-300 italic text-sm">"{study.quote}"</p>
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Competitive Advantages */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-slate-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Waarom Wij Anders Zijn Dan <span className="text-emerald-400">Alle Anderen</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              We bouwden niet zomaar een boekingstool. We bouwden de meest geavanceerde AI-assistent die écht je bedrijf begrijpt.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {competitiveAdvantages.map((advantage, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300"
                delay={index * 150}
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <advantage.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{advantage.title}</h3>
                <p className="text-slate-300 mb-4">{advantage.description}</p>
                <div className="text-emerald-400 font-bold text-sm">
                  {advantage.proof}
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Social Proof - Testimonials */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Waarom Bedrijven Overstappen Van Concurrenten Naar Ons
            </h2>
            <p className="text-xl text-slate-300">
              Echte verhalen van bedrijven die anderen eerst probeerden, en toen ons vonden
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300"
                delay={index * 150}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 italic font-medium">"{testimonial.quote}"</p>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-bold text-white">{testimonial.author}</div>
                    <div className="text-slate-400 text-sm">{testimonial.role}</div>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/20">
                    {testimonial.result}
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Digital Transformation Conclusion */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              De Toekomst is <span className="text-green-400">Mobile-First</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
              De verschuiving van e-mail naar WhatsApp is niet tijdelijk - het is onderdeel van een bredere digitale transformatie. 
              Consumenten verwachten snelheid, gemak en persoonlijke communicatie. Bedrijven die dit omarmen, 
              <strong className="text-emerald-400"> winnen meer klanten, behouden ze langer en groeien sneller</strong>.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mobile-First Gedrag</h3>
              <p className="text-slate-300">96x per dag checken mensen hun telefoon. WhatsApp past in hun natuurlijke gedrag.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Verwachting van Snelheid</h3>
              <p className="text-slate-300">Klanten verwachten directe reacties. WhatsApp levert dit, e-mail niet meer.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Persoonlijke Connectie</h3>
              <p className="text-slate-300">85% prefereert berichten boven e-mails. Het voelt persoonlijker en vertrouwder.</p>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">Conclusie in Één Zin</h3>
              <p className="text-xl text-green-300 leading-relaxed">
                Voor het plannen en managen van klantafspraken is WhatsApp in 2025 een <strong>bewezen superieur kanaal</strong> 
                ten opzichte van e-mail – het zorgt voor snellere bevestiging, hogere opkomst en een soepelere klantervaring, 
                wat uiteindelijk leidt tot <strong>betere bedrijfsresultaten</strong>.
              </p>
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Pricing Section */}
      <ScrollAnimatedSection delay={200}>
        <PricingBasic />
      </ScrollAnimatedSection>
    </div>
  );
};

export default WhyUs;

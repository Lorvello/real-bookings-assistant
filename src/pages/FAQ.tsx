
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, Zap, Shield, Star, CheckCircle, HelpCircle, Phone, Mail } from 'lucide-react';

const FAQ = () => {
  const faqSections = [
    {
      title: "Algemene Vragen",
      icon: HelpCircle,
      color: "from-blue-500/10 to-purple-500/10",
      borderColor: "border-blue-500/20",
      items: [
        {
          question: "Wat is jullie WhatsApp boekingsplatform?",
          answer: "Ons platform is een AI-powered WhatsApp assistent die automatisch afspraken boekt, bevestigt en beheert voor servicegerichte bedrijven. Klanten kunnen 24/7 afspraken maken via WhatsApp zonder enige handmatige interventie van jou."
        },
        {
          question: "Hoe werkt het precies?",
          answer: "Klanten sturen een WhatsApp bericht naar jouw bedrijfsnummer. Onze AI begrijpt hun verzoek, checkt jouw beschikbaarheid, boekt automatisch de afspraak en stuurt bevestigingen naar beide partijen. Alles synchroniseert met jouw agenda."
        },
        {
          question: "Voor welke types bedrijven is dit geschikt?",
          answer: "Perfect voor kappers, tandartsen, fysiotherapeuten, schoonheidssalons, fitness studio's, consultants, advocaten, massagetherapeuten, nagelstudio's, barbershops en alle andere dienstverleners die met afspraken werken."
        },
        {
          question: "Hoeveel tijd bespaart dit mij?",
          answer: "Gemiddeld besparen onze klanten 10-15 uur per week aan telefoon opnemen en afspraken inplannen. Je kunt je volledig focussen op je klanten in plaats van administratie."
        },
        {
          question: "Is het moeilijk op te zetten?",
          answer: "Nee! Setup duurt meestal 5-10 minuten. Je verbindt je WhatsApp nummer, importeert je agenda en de AI leert automatisch je diensten en prijzen."
        }
      ]
    },
    {
      title: "Technische Vragen",
      icon: Zap,
      color: "from-green-500/10 to-emerald-500/10",
      borderColor: "border-green-500/20",
      items: [
        {
          question: "Heb ik een business WhatsApp nummer nodig?",
          answer: "Het wordt aangeraden. Je gebruikt ons business WhatsApp nummer dat we je geven, maar je kunt ook je eigen gebruiken indien nodig."
        },
        {
          question: "Met welke agenda's integreert het?",
          answer: "Google Agenda, Outlook, Apple Agenda, Calendly en de meeste populaire agenda applicaties. Ook CRM systemen zoals Notion, Airtable en HubSpot."
        },
        {
          question: "Werkt het in meerdere talen?",
          answer: "Ja! Onze AI spreekt vloeiend Nederlands, Engels, Spaans, Frans, Duits en 20+ andere talen. Je kunt de toon en stijl aanpassen aan jouw bedrijf."
        },
        {
          question: "Wat gebeurt er als de AI een fout maakt?",
          answer: "De AI maakt geen fouten. Je krijgt altijd notificaties van geboekte afspraken en kunt ze binnen 5 minuten annuleren of wijzigen."
        },
        {
          question: "Zijn mijn gegevens veilig?",
          answer: "Absoluut. We zijn GDPR compliant, gebruiken end-to-end encryptie en hebben SOC 2 certificering. Jouw klantgegevens worden nooit gedeeld."
        },
        {
          question: "Kan ik de chatbot aanpassen?",
          answer: "Ja! Je kunt de persoonlijkheid, antwoorden, diensten, prijzen en beschikbaarheid volledig aanpassen. Het voelt als jouw persoonlijke assistent."
        }
      ]
    },
    {
      title: "Prijzen & Plannen",
      icon: Star,
      color: "from-yellow-500/10 to-orange-500/10",
      borderColor: "border-yellow-500/20",
      items: [
        {
          question: "Wat kost het?",
          answer: "Starter begint bij €20/maand, Professional €48/maand en Enterprise custom pricing. Starter en Professional plannen hebben een gratis 7-dagen proefperiode. Enterprise heeft geen gratis proefperiode."
        },
        {
          question: "Zijn er setup kosten?",
          answer: "Geen setup kosten. Je betaalt alleen het maandelijkse abonnement."
        },
        {
          question: "Kan ik upgraden of downgraden?",
          answer: "Ja, je kunt altijd wisselen tussen plannen. Wijzigingen gaan in vanaf de volgende factureringsperiode."
        },
        {
          question: "Wat gebeurt er als ik stop?",
          answer: "Je kunt altijd je data exporteren. We bewaren je gegevens 30 dagen na opzegging voor het geval je terug wilt komen."
        },
        {
          question: "Is er een lange termijn contract?",
          answer: "Nee, je kunt maandelijks opzeggen. Je krijgt echter 20% korting bij jaarlijkse betaling."
        }
      ]
    },
    {
      title: "Functies",
      icon: CheckCircle,
      color: "from-emerald-500/10 to-green-500/10",
      borderColor: "border-emerald-500/20",
      items: [
        {
          question: "Kan het afspraken verzetten en annuleren?",
          answer: "Ja! Klanten kunnen hun afspraken zelf wijzigen via WhatsApp. Het systeem checkt automatisch nieuwe beschikbaarheid."
        },
        {
          question: "Stuurt het herinneringen?",
          answer: "Ja, automatische herinneringen 24 uur en 2 uur voor de afspraak. Je kunt frequentie en timing zelf instellen."
        },
        {
          question: "Kan het betalingen verwerken?",
          answer: "Niet direct op dit moment, maar we kunnen betaallinks versturen via WhatsApp. Volledige betaalintegratie komt binnenkort."
        },
        {
          question: "Handelt het no-shows af?",
          answer: "Ja! Het systeem detecteert no-shows en kan automatisch follow-up berichten sturen of vervangingsafspraken aanbieden."
        },
        {
          question: "Kan ik meerdere diensten aanbieden?",
          answer: "Absoluut. Je kunt verschillende diensten, prijzen en duur instellen. De AI begrijpt wat klanten willen."
        },
        {
          question: "Werkt het voor groepsafspraken?",
          answer: "Ja, je kunt groepslessen, workshops of events instellen met maximum aantal deelnemers."
        }
      ]
    },
    {
      title: "Support",
      icon: Shield,
      color: "from-purple-500/10 to-pink-500/10",
      borderColor: "border-purple-500/20",
      items: [
        {
          question: "Welk type support kan ik krijgen?",
          answer: "Starter: toegewijde support. Professional: priority support. Enterprise: toegewijde priority support."
        },
        {
          question: "Hoe snel krijg ik een reactie?",
          answer: "Toegewijde support: binnen 24 uur. Priority support: binnen 4 uur. Toegewijde priority support: binnen 1 uur."
        },
        {
          question: "Is training beschikbaar?",
          answer: "Ja! We bieden gratis onboarding sessies, video tutorials en voor Enterprise klanten gepersonaliseerde training."
        },
        {
          question: "Kan jullie team het voor mij opzetten?",
          answer: "Voor Enterprise klanten doen we \"done-for-you\" setup. Voor andere plannen hebben we gedetailleerde handleidingen en support."
        }
      ]
    },
    {
      title: "Integraties",
      icon: Zap,
      color: "from-cyan-500/10 to-blue-500/10",
      borderColor: "border-cyan-500/20",
      items: [
        {
          question: "Welke CRM systemen worden ondersteund?",
          answer: "Notion, Airtable, HubSpot, Salesforce, Pipedrive en vele anderen via API connecties."
        },
        {
          question: "Werkt het met mijn website?",
          answer: "Ja! Je kunt een WhatsApp widget op je website plaatsen die direct linkt naar de booking bot."
        },
        {
          question: "Kan het social media posts maken?",
          answer: "Enterprise klanten krijgen automatische social media content creatie en posting (Instagram, Facebook, LinkedIn)."
        },
        {
          question: "Integreert het met email marketing?",
          answer: "Ja, we kunnen automatisch klanten toevoegen aan je Mailchimp, Klaviyo of andere email lijsten."
        }
      ]
    },
    {
      title: "Geavanceerde Functies",
      icon: Star,
      color: "from-indigo-500/10 to-purple-500/10",
      borderColor: "border-indigo-500/20",
      items: [
        {
          question: "Kan het meerdere locaties beheren?",
          answer: "Enterprise klanten kunnen onbeperkte locaties en nummers beheren vanuit één dashboard."
        },
        {
          question: "Zijn analytics beschikbaar?",
          answer: "Ja! Gedetailleerde rapporten over boekingspercentages, populaire tijden, no-show percentages en omzet tracking."
        },
        {
          question: "Kan het klanten screenen?",
          answer: "Ja, je kunt pre-booking vragen instellen om nieuwe klanten te kwalificeren voordat ze boeken."
        },
        {
          question: "Werkt het met wachtlijsten?",
          answer: "Ja! Wanneer je volgeboekt bent, kunnen klanten zich op de wachtlijst zetten en automatisch worden genotificeerd bij annuleringen."
        },
        {
          question: "Kan het upsellen?",
          answer: "Absoluut. De AI kan extra diensten, producten of langere sessies voorstellen tijdens het boekingsproces."
        }
      ]
    },
    {
      title: "Probleemoplossing",
      icon: MessageCircle,
      color: "from-red-500/10 to-pink-500/10",
      borderColor: "border-red-500/20",
      items: [
        {
          question: "Wat als WhatsApp down is?",
          answer: "We hebben backup systemen en kunnen tijdelijk overschakelen naar SMS of email notificaties."
        },
        {
          question: "Mijn klanten zijn niet tech-savvy, werkt dit?",
          answer: "Ja! WhatsApp is bekend bij de meeste mensen. De AI gebruikt eenvoudige taal en begeleidt klanten stap voor stap."
        },
        {
          question: "Kan ik het uitzetten tijdens vakanties?",
          answer: "Ja, je kunt vakantiemodus activeren die klanten informeert over je afwezigheid en wanneer je terugkomt."
        },
        {
          question: "Wat als ik mijn telefoon kwijtraak?",
          answer: "Je WhatsApp Business account is gekoppeld aan ons platform, niet aan je telefoon. Je kunt altijd inloggen via de web interface."
        },
        {
          question: "Hoe zeg ik mijn abonnement op?",
          answer: "Je kunt altijd opzeggen vanuit je dashboard of door contact op te nemen met support. Geen opzegkosten."
        },
        {
          question: "Bieden jullie refunds aan?",
          answer: "We bieden een 7-dagen gratis proefperiode, dus je kunt alles risico-vrij testen. Daarna geen refunds maar je kunt altijd opzeggen."
        },
        {
          question: "Kan ik mijn abonnement pauzeren?",
          answer: "Enterprise klanten kunnen hun abonnement pauzeren. Andere plannen moeten opzeggen en opnieuw starten wanneer klaar."
        },
        {
          question: "Welke landen ondersteunen jullie?",
          answer: "We ondersteunen bedrijven wereldwijd, met lokale telefoonnummer support in 50+ landen."
        },
        {
          question: "Is er een app?",
          answer: "Ja! We hebben mobiele apps voor iOS en Android om je boekingen onderweg te beheren."
        },
        {
          question: "Kunnen meerdere teamleden toegang krijgen?",
          answer: "Professional en Enterprise plannen ondersteunen meerdere teamleden toegang met verschillende permissieniveaus."
        }
      ]
    }
  ];

  const quickStats = [
    { number: "95%", label: "Berichten gelezen binnen 5 min", icon: MessageCircle },
    { number: "50%", label: "Minder no-shows", icon: CheckCircle },
    { number: "18x", label: "Snellere reacties", icon: Zap },
    { number: "24/7", label: "Automatische boekingen", icon: Shield }
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
          <ScrollAnimatedSection>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Veelgestelde <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Vragen</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-16">
              Alles wat je moet weten over ons AI-powered WhatsApp boekingsplatform. 
              Kan je niet vinden wat je zoekt? <strong className="text-emerald-400">Neem contact op met ons support team</strong>.
            </p>
          </ScrollAnimatedSection>

          {/* Quick Stats */}
          <ScrollAnimatedSection delay={200}>
            <div className="grid md:grid-cols-4 gap-6 mb-16">
              {quickStats.map((stat, index) => (
                <div key={index} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <stat.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollAnimatedSection>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-12">
            {faqSections.map((section, sectionIndex) => (
              <ScrollAnimatedSection 
                key={sectionIndex} 
                className={`bg-gradient-to-r ${section.color} backdrop-blur-sm rounded-2xl p-8 border ${section.borderColor} hover:border-opacity-40 transition-all duration-300`}
                delay={sectionIndex * 100}
              >
                {/* Section Header */}
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                    <section.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{section.title}</h2>
                    <div className="h-1 w-20 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full"></div>
                  </div>
                </div>

                {/* FAQ Items */}
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {section.items.map((item, itemIndex) => (
                    <AccordionItem 
                      key={itemIndex} 
                      value={`${sectionIndex}-${itemIndex}`}
                      className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 px-6 hover:bg-slate-800/50 transition-all duration-300"
                    >
                      <AccordionTrigger className="text-left hover:no-underline hover:text-emerald-400 transition-colors py-6">
                        <span className="font-semibold text-white text-lg">{item.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-300 leading-relaxed pb-6 text-base">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-slate-800/20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 backdrop-blur-sm rounded-2xl p-12 border border-emerald-500/20">
            <h3 className="text-3xl font-bold text-white mb-6">
              Nog steeds vragen?
            </h3>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Ons support team staat klaar om je te helpen met AI-powered booking automatisering. 
              Neem contact op en we beantwoorden alle vragen die je hebt.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>Start WhatsApp Chat</span>
              </button>
              
              <button className="bg-slate-800/50 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800/70 transition-all duration-300 border border-slate-700/50 hover:border-slate-600/50 flex items-center justify-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Email Ondersteuning</span>
              </button>
            </div>

            <div className="mt-8 text-slate-400 text-sm">
              <p>📞 <strong>Telefonische support:</strong> Ma-Vr 9:00-18:00</p>
              <p>💬 <strong>Live chat:</strong> 24/7 beschikbaar</p>
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>
    </div>
  );
};

export default FAQ;

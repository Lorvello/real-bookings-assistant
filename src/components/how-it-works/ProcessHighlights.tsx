
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { ArrowRight, CheckCircle, Calendar, Settings, MessageCircle, Clock, Users, Zap, Shield } from 'lucide-react';

const ProcessHighlights = () => {
  return (
    <ScrollAnimatedSection>
      <div className="max-w-4xl mx-auto mt-20">
        {/* Main Process Flow */}
        <div className="space-y-12">
          {/* Step indicators */}
          <div className="text-center">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-700 to-green-700 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">3</span>
              </div>
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
              3 stappen. 5 minuten. Klaar.
            </h3>
          </div>

          {/* Detailed Step 1 */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-12 backdrop-blur-sm">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h4 className="text-3xl font-bold text-white">Vul je basisgegevens in</h4>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h5 className="text-xl font-semibold text-emerald-300 mb-4">Wat heb je nodig?</h5>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>Je bedrijfsnaam</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>Website URL (optioneel)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>Email adres</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>Type diensten die je aanbiedt</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h5 className="text-xl font-semibold text-emerald-300 mb-4">Kalender verbinden</h5>
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <span className="font-semibold text-white">Optie 1: Gebruik onze kalender</span>
                    </div>
                    <p className="text-sm text-slate-300">Direct klaar om te gebruiken. Geen setup nodig.</p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Settings className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-white">Optie 2: Verbind je eigen kalender</span>
                    </div>
                    <p className="text-sm text-slate-300">Google Calendar, Outlook, Apple Calendar - alles wordt gesynchroniseerd.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-emerald-400" />
                <span className="text-emerald-300 font-semibold text-lg">Tijd nodig: 2 minuten</span>
              </div>
              <p className="text-emerald-200">
                <strong className="text-white">Geen technische kennis vereist.</strong> Onze wizard begeleidt je door elke stap.
              </p>
            </div>
          </div>

          {/* Detailed Step 2 */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/30 rounded-3xl p-12 backdrop-blur-sm">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h4 className="text-3xl font-bold text-white">Kies je WhatsApp strategie</h4>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/40 rounded-2xl p-6 relative">
                  <div className="absolute -top-3 -right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Aanbevolen
                  </div>
                  <h5 className="text-xl font-semibold text-white mb-3">Wij regelen een nummer voor je</h5>
                  <ul className="space-y-2 text-emerald-200 mb-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Binnen 5 minuten live</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Nederlands nummer</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Volledig beheerd door ons</span>
                    </li>
                  </ul>
                  <p className="text-sm text-emerald-300">
                    <strong>Perfect voor:</strong> Bedrijven die snel willen starten zonder gedoe.
                  </p>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-2xl p-6">
                  <h5 className="text-xl font-semibold text-white mb-3">Je eigen nummer gebruiken</h5>
                  <ul className="space-y-2 text-slate-300 mb-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-slate-400" />
                      <span>Behoud je huidige nummer</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-slate-400" />
                      <span>Klanten kennen het al</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-slate-400" />
                      <span>Stap-voor-stap begeleiding</span>
                    </li>
                  </ul>
                  <p className="text-sm text-slate-400">
                    <strong>Perfect voor:</strong> Gevestigde bedrijven met een bekend WhatsApp nummer.
                  </p>
                </div>
              </div>
              
              <div>
                <h5 className="text-xl font-semibold text-slate-300 mb-6">Hoe werkt de integratie?</h5>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h6 className="font-semibold text-white mb-1">Veilige verbinding</h6>
                      <p className="text-sm text-slate-300">We maken een beveiligde API-verbinding met WhatsApp Business.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h6 className="font-semibold text-white mb-1">AI training</h6>
                      <p className="text-sm text-slate-300">Onze AI leert je bedrijfsstijl en services kennen.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h6 className="font-semibold text-white mb-1">Testing</h6>
                      <p className="text-sm text-slate-300">We testen alles grondig voordat het live gaat.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-700/30 border border-slate-600/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-slate-400" />
                <span className="text-slate-300 font-semibold text-lg">Tijd nodig: 2-3 minuten</span>
              </div>
              <p className="text-slate-300">
                <strong className="text-white">100% veilig en GDPR-compliant.</strong> Je WhatsApp gegevens blijven volledig privé.
              </p>
            </div>
          </div>

          {/* Detailed Step 3 */}
          <div className="bg-gradient-to-r from-emerald-500/5 to-green-500/5 border border-emerald-500/15 rounded-3xl p-12 backdrop-blur-sm">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-700 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h4 className="text-3xl font-bold text-white">Je assistent gaat live</h4>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6">
                <MessageCircle className="w-10 h-10 text-emerald-400 mb-4" />
                <h5 className="text-lg font-semibold text-white mb-3">Intelligente gesprekken</h5>
                <p className="text-sm text-slate-300 mb-4">
                  Je AI assistent voert natuurlijke gesprekken en begrijpt context, vragen en wensen van klanten.
                </p>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>• Detecteert urgentie</li>
                  <li>• Herkent servicevoorkeuren</li>
                  <li>• Stelt vervolgvragen</li>
                </ul>
              </div>
              
              <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6">
                <Calendar className="w-10 h-10 text-emerald-400 mb-4" />
                <h5 className="text-lg font-semibold text-white mb-3">Slimme planning</h5>
                <p className="text-sm text-slate-300 mb-4">
                  Automatische beschikbaarheid check, dubbele boekingen voorkomen, en optimale tijdslots voorstellen.
                </p>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>• Real-time agenda sync</li>
                  <li>• Bufferijd berekening</li>
                  <li>• Reistijd compensatie</li>
                </ul>
              </div>
              
              <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6">
                <Users className="w-10 h-10 text-emerald-400 mb-4" />
                <h5 className="text-lg font-semibold text-white mb-3">Persoonlijke service</h5>
                <p className="text-sm text-slate-300 mb-4">
                  Elke klant krijgt gepersonaliseerde aandacht, zelfs van je AI assistent.
                </p>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>• Klanthistorie onthouden</li>
                  <li>• Voorkeuren bewaren</li>
                  <li>• Persoonlijke tone-of-voice</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 rounded-2xl p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap className="w-8 h-8 text-emerald-400" />
                <span className="text-2xl font-bold text-white">Vanaf nu draait alles automatisch</span>
              </div>
              <p className="text-xl text-slate-200 leading-relaxed max-w-3xl mx-auto mb-6">
                <strong className="text-white">24/7 beschikbaar.</strong> Je klanten kunnen altijd afspraken maken, 
                vragen stellen, of bestaande afspraken wijzigen. <strong className="text-white">Zonder dat jij er bent.</strong>
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
                  <h6 className="font-semibold text-white mb-2">Wat gebeurt er automatisch?</h6>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>✓ Afspraken boeken en bevestigen</li>
                    <li>✓ Herinneringen versturen</li>
                    <li>✓ Wijzigingen verwerken</li>
                    <li>✓ Vragen beantwoorden</li>
                  </ul>
                </div>
                
                <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
                  <h6 className="font-semibold text-white mb-2">Wanneer word je ingeschakeld?</h6>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Complexe vragen</li>
                    <li>• Speciale verzoeken</li>
                    <li>• Klachten of problemen</li>
                    <li>• Als klant erom vraagt</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Result Statement */}
          <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/30 rounded-3xl p-10 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
              <span className="text-3xl font-bold text-white">Het resultaat:</span>
            </div>
            <p className="text-2xl text-slate-200 leading-relaxed max-w-4xl mx-auto mb-8">
              Vanaf nu hoef jij <strong className="text-white">nooit meer</strong> tijd te verspillen aan het heen-en-weer appen over afspraken. 
              Je krijgt <strong className="text-white">meer boekingen</strong>, <strong className="text-white">tevredener klanten</strong>, 
              en <strong className="text-white">meer tijd</strong> voor wat echt belangrijk is.
            </p>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">95%</div>
                <div className="text-sm text-emerald-200">Minder tijd aan administratie</div>
              </div>
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">24/7</div>
                <div className="text-sm text-emerald-200">Beschikbaar voor klanten</div>
              </div>
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">0</div>
                <div className="text-sm text-emerald-200">Gemiste afspraken</div>
              </div>
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">∞</div>
                <div className="text-sm text-emerald-200">Gelijktijdige gesprekken</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;

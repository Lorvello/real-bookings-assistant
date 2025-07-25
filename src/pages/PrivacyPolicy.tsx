import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#2C3E50' }}>
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          to="/signup" 
          className="inline-flex items-center text-sm text-gray-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar registratie
        </Link>

        {/* Main Card */}
        <Card className="bg-card border-border shadow-xl">
          <CardHeader className="text-center border-b border-border">
            <CardTitle className="text-3xl font-bold text-foreground">
              Privacy Policy
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  1. Inleiding
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Wij respecteren uw privacy en zijn toegewijd aan het beschermen van uw persoonlijke gegevens. 
                  Deze privacy policy legt uit hoe wij uw gegevens verzamelen, gebruiken, opslaan en beschermen 
                  wanneer u onze kalenderboeking service gebruikt.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-green-500" />
                  2. Welke gegevens verzamelen wij
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Wij verzamelen de volgende categorieën van persoonlijke gegevens:
                </p>
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Accountgegevens:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Volledige naam</li>
                      <li>E-mailadres</li>
                      <li>Telefoonnummer</li>
                      <li>Bedrijfsnaam</li>
                      <li>Wachtwoord (versleuteld opgeslagen)</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Bedrijfsgegevens:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Bedrijfstype en -beschrijving</li>
                      <li>Serviceaanbod en afspraaktypes</li>
                      <li>Beschikbaarheidsschema's</li>
                      <li>Boekingsinstellingen</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Gebruiksgegevens:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Login-activiteit en sessiegegevens</li>
                      <li>IP-adres en browserinformatie</li>
                      <li>Gebruiksstatistieken van het platform</li>
                      <li>Foutlogs en technische diagnostiek</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-green-500" />
                  3. Hoe gebruiken wij uw gegevens
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Wij gebruiken uw persoonlijke gegevens voor de volgende doeleinden:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Het leveren en onderhouden van onze kalenderboeking service</li>
                  <li>Het verwerken van boekingen en afspraken</li>
                  <li>Het versturen van bevestigings- en herinneringsmails</li>
                  <li>Het bieden van klantenservice en technische ondersteuning</li>
                  <li>Het verbeteren van onze service en gebruikerservaring</li>
                  <li>Het naleven van wettelijke verplichtingen</li>
                  <li>Het voorkomen van fraude en misbruik</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-green-500" />
                  4. Gegevensdeling en openbaarmaking
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Wij delen uw persoonlijke gegevens niet met derden, behalve in de volgende gevallen:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li><strong>Met uw toestemming:</strong> Wanneer u expliciet heeft ingestemd met het delen</li>
                  <li><strong>Serviceproviders:</strong> Vertrouwde partners die ons helpen de service te leveren (hosting, e-mail, betaling)</li>
                  <li><strong>Wettelijke vereisten:</strong> Wanneer dit vereist is door de wet of gerechtelijke bevelen</li>
                  <li><strong>Bedrijfsoverdracht:</strong> Bij fusie, overname of verkoop van bedrijfsonderdelen</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  5. Gegevensbeveiliging
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Wij implementeren passende technische en organisatorische maatregelen om uw gegevens te beschermen:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Technische beveiliging:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>SSL/TLS encryptie</li>
                      <li>Beveiligde databases</li>
                      <li>Regular security updates</li>
                      <li>Toegangscontroles</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Organisatorische beveiliging:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>Beperkte toegang tot gegevens</li>
                      <li>Regelmatige beveiligingsaudits</li>
                      <li>Medewerkerstraining</li>
                      <li>Incident response procedures</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                  6. Uw rechten onder de AVG
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Als EU-inwoner heeft u de volgende rechten betreffende uw persoonlijke gegevens:
                </p>
                <div className="space-y-3">
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Recht op toegang</h3>
                    <p className="text-sm text-muted-foreground">U kunt een kopie opvragen van alle persoonlijke gegevens die wij van u hebben</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Recht op rectificatie</h3>
                    <p className="text-sm text-muted-foreground">U kunt verzoeken om correctie van onjuiste of onvolledige gegevens</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Recht op verwijdering</h3>
                    <p className="text-sm text-muted-foreground">U kunt verzoeken om verwijdering van uw persoonlijke gegevens</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Recht op dataportabiliteit</h3>
                    <p className="text-sm text-muted-foreground">U kunt uw gegevens in een machine-leesbaar formaat opvragen</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-green-500" />
                  7. Bewaartermijnen
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Wij bewaren uw gegevens alleen zolang nodig voor de doeleinden waarvoor ze zijn verzameld:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li><strong>Actieve accounts:</strong> Zolang uw account actief is</li>
                  <li><strong>Gesloten accounts:</strong> Tot 30 dagen na sluiting (tenzij wettelijk anders vereist)</li>
                  <li><strong>Boekingsgegevens:</strong> Tot 7 jaar voor administratieve doeleinden</li>
                  <li><strong>Logbestanden:</strong> Maximaal 12 maanden</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-500" />
                  8. Cookies en tracking
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Onze website gebruikt cookies en vergelijkbare technologieën voor:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Het onthouden van uw voorkeuren en inlogstatus</li>
                  <li>Het analyseren van websitegebruik voor verbeteringen</li>
                  <li>Het bieden van gepersonaliseerde gebruikerservaring</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  U kunt cookies beheren via uw browserinstellingen, maar dit kan de functionaliteit beïnvloeden.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  9. Wijzigingen in deze privacy policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Wij kunnen deze privacy policy van tijd tot tijd bijwerken. Belangrijke wijzigingen 
                  zullen we u meedelen via e-mail of een prominente melding op onze website. 
                  De datum van de laatste wijziging staat altijd bovenaan dit document.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-500" />
                  10. Contact en vragen
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Voor vragen over deze privacy policy of het uitoefenen van uw rechten kunt u contact met ons opnemen:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <p className="text-muted-foreground"><strong>E-mail:</strong> privacy@example.com</p>
                    <p className="text-muted-foreground"><strong>Telefoon:</strong> +31 20 123 4567</p>
                    <p className="text-muted-foreground"><strong>Adres:</strong> [Bedrijfsadres]</p>
                    <p className="text-muted-foreground"><strong>Functionaris Gegevensbescherming:</strong> dpo@example.com</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-3 text-sm">
                  U heeft ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens 
                  als u van mening bent dat wij uw gegevens niet correct behandelen.
                </p>
              </section>

            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Button asChild className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" style={{ backgroundColor: '#10B981' }}>
                  <Link to="/signup">
                    Terug naar registratie
                  </Link>
                </Button>
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <Link to="/terms-of-service" className="text-primary hover:text-primary/80 underline">
                    Terms of Service
                  </Link>
                  <Link to="/faq" className="text-primary hover:text-primary/80 underline">
                    FAQ
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
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
              Terms of Service
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  1. Acceptatie van voorwaarden
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Door onze kalenderboeking service te gebruiken, stemt u in met deze servicevoorwaarden. 
                  Als u niet akkoord gaat met deze voorwaarden, mag u onze service niet gebruiken.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  2. Beschrijving van de service
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Onze service biedt een multi-tenant kalenderboeking platform waarbij bedrijven:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Hun eigen kalenderinstellingen kunnen beheren</li>
                  <li>Afspraaktypes kunnen configureren</li>
                  <li>Beschikbaarheid kunnen instellen</li>
                  <li>Automatische boekingsprocessen kunnen opzetten</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  3. Account en registratie
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Voor het gebruik van onze service moet u:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Accurate en volledige informatie verstrekken tijdens registratie</li>
                  <li>Uw accountinformatie up-to-date houden</li>
                  <li>Verantwoordelijk zijn voor alle activiteiten onder uw account</li>
                  <li>Uw wachtwoord veilig houden en niet delen</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  4. Toegestaan gebruik
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  U mag onze service gebruiken voor:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Legitieme bedrijfsactiviteiten</li>
                  <li>Het beheren van afspraken en boekingen</li>
                  <li>Communicatie met klanten over boekingen</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4 mb-3">
                  Het is niet toegestaan om:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>De service te gebruiken voor illegale activiteiten</li>
                  <li>Spam of ongewenste berichten te verzenden</li>
                  <li>De service te proberen te hacken of misbruiken</li>
                  <li>Accounts van andere gebruikers te benaderen zonder toestemming</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  5. Gegevensbescherming
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Wij nemen gegevensbescherming serieus. Uw persoonlijke gegevens worden verwerkt 
                  in overeenstemming met onze Privacy Policy en de geldende privacywetgeving, 
                  waaronder de AVG (GDPR).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  6. Service beschikbaarheid
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Wij streven ernaar om onze service 24/7 beschikbaar te houden, maar kunnen 
                  geen 100% uptime garanderen. Onderhoud en updates kunnen tijdelijke 
                  onderbreking van de service veroorzaken.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  7. Betalingen en facturering
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Betalingsvoorwaarden worden gespecificeerd in uw abonnement. Alle prijzen 
                  zijn exclusief BTW tenzij anders vermeld. Betalingen zijn verschuldigd 
                  volgens de overeengekomen betalingstermijnen.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  8. Beëindiging
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  U kunt uw account op elk moment opzeggen. Wij behouden ons het recht voor 
                  om accounts op te schorten of te beëindigen bij schending van deze voorwaarden 
                  of misbruik van de service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  9. Aansprakelijkheid
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Onze aansprakelijkheid is beperkt tot het bedrag dat u heeft betaald voor 
                  de service in de 12 maanden voorafgaand aan de claim. Wij zijn niet 
                  aansprakelijk voor indirecte schade of gevolgschade.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  10. Wijzigingen
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Wij behouden ons het recht voor om deze voorwaarden te wijzigen. 
                  Wijzigingen worden van kracht 30 dagen na kennisgeving via e-mail 
                  of via onze website.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  11. Toepasselijk recht
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Deze voorwaarden worden beheerst door Nederlands recht. Geschillen 
                  worden voorgelegd aan de bevoegde rechter in Nederland.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  12. Contact
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Voor vragen over deze voorwaarden kunt u contact met ons opnemen via:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-muted-foreground">E-mail: info@example.com</p>
                  <p className="text-muted-foreground">Telefoon: +31 20 123 4567</p>
                </div>
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
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80 underline">
                    Privacy Policy
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

export default TermsOfService;
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Link 
            to="/signup" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar registratie
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Terms of Service
          </h1>
          <p className="mt-2 text-gray-600">
            Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 space-y-6 sm:space-y-8">
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptatie van voorwaarden</h2>
            <p className="text-gray-700 leading-relaxed">
              Door onze kalenderboeking service te gebruiken, stemt u in met deze servicevoorwaarden. 
              Als u niet akkoord gaat met deze voorwaarden, mag u onze service niet gebruiken.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Beschrijving van de service</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Onze service biedt een multi-tenant kalenderboeking platform waarbij bedrijven:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Hun eigen kalenderinstellingen kunnen beheren</li>
              <li>Afspraaktypes kunnen configureren</li>
              <li>Beschikbaarheid kunnen instellen</li>
              <li>Automatische boekingsprocessen kunnen opzetten</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account en registratie</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Voor het gebruik van onze service moet u:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Accurate en volledige informatie verstrekken tijdens registratie</li>
              <li>Uw accountinformatie up-to-date houden</li>
              <li>Verantwoordelijk zijn voor alle activiteiten onder uw account</li>
              <li>Uw wachtwoord veilig houden en niet delen</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Toegestaan gebruik</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              U mag onze service gebruiken voor:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Legitieme bedrijfsactiviteiten</li>
              <li>Het beheren van afspraken en boekingen</li>
              <li>Communicatie met klanten over boekingen</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 mb-3">
              Het is niet toegestaan om:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>De service te gebruiken voor illegale activiteiten</li>
              <li>Spam of ongewenste berichten te verzenden</li>
              <li>De service te proberen te hacken of misbruiken</li>
              <li>Accounts van andere gebruikers te benaderen zonder toestemming</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Gegevensbescherming</h2>
            <p className="text-gray-700 leading-relaxed">
              Wij nemen gegevensbescherming serieus. Uw persoonlijke gegevens worden verwerkt 
              in overeenstemming met onze Privacy Policy en de geldende privacywetgeving, 
              waaronder de AVG (GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Service beschikbaarheid</h2>
            <p className="text-gray-700 leading-relaxed">
              Wij streven ernaar om onze service 24/7 beschikbaar te houden, maar kunnen 
              geen 100% uptime garanderen. Onderhoud en updates kunnen tijdelijke 
              onderbreking van de service veroorzaken.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Betalingen en facturering</h2>
            <p className="text-gray-700 leading-relaxed">
              Betalingsvoorwaarden worden gespecificeerd in uw abonnement. Alle prijzen 
              zijn exclusief BTW tenzij anders vermeld. Betalingen zijn verschuldigd 
              volgens de overeengekomen betalingstermijnen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Beëindiging</h2>
            <p className="text-gray-700 leading-relaxed">
              U kunt uw account op elk moment opzeggen. Wij behouden ons het recht voor 
              om accounts op te schorten of te beëindigen bij schending van deze voorwaarden 
              of misbruik van de service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Aansprakelijkheid</h2>
            <p className="text-gray-700 leading-relaxed">
              Onze aansprakelijkheid is beperkt tot het bedrag dat u heeft betaald voor 
              de service in de 12 maanden voorafgaand aan de claim. Wij zijn niet 
              aansprakelijk voor indirecte schade of gevolgschade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Wijzigingen</h2>
            <p className="text-gray-700 leading-relaxed">
              Wij behouden ons het recht voor om deze voorwaarden te wijzigen. 
              Wijzigingen worden van kracht 30 dagen na kennisgeving via e-mail 
              of via onze website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Toepasselijk recht</h2>
            <p className="text-gray-700 leading-relaxed">
              Deze voorwaarden worden beheerst door Nederlands recht. Geschillen 
              worden voorgelegd aan de bevoegde rechter in Nederland.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              Voor vragen over deze voorwaarden kunt u contact met ons opnemen via:
            </p>
            <div className="mt-3 text-gray-700">
              <p>E-mail: info@example.com</p>
              <p>Telefoon: +31 20 123 4567</p>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link 
            to="/signup" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Terug naar registratie
          </Link>
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-800">
              Privacy Policy
            </Link>
            <Link to="/faq" className="text-blue-600 hover:text-blue-800">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
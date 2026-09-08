# R5-A BAKE-OFF: DE JURY-RUBRIEK

**De jury is nooit het eindoordeel.** Een AI-jury kan een gemeten flop op 1 zetten, dus zijn
uitslag reist altijd naast de harde poorten en de latency. Waar jury en poorten uit elkaar lopen,
wint de poort: die meet de database, de jury leest tekst.

## Wat de jury ziet

Per scenario, voor ALLE kandidaten tegelijk, in willekeurige volgorde en zonder modelnaam:

1. de klantberichten, in volgorde;
2. het antwoord van de agent op elke beurt;
3. de TOOLNAMEN die die beurt vuurden;
4. **de DB-EFFECTEN**: welke boekingen er stonden voor en na, met status, tijd en naam; welke
   markers er in de gesprekscontext zaten; welke auditrijen er zijn geschreven; welke
   betaalsessies er zijn ontstaan.

Punt 4 is geen extra: zonder de DB-effecten beoordeelt de jury een ander voorwerp dan het
product. Een vriendelijk antwoord dat niets boekte moet zichtbaar anders scoren dan hetzelfde
antwoord met de boeking erachter.

## Wat de jury NIET ziet

De modelnaam, de leverancier, de latency, de kosten en de uitslag van de harde poorten. Anders
scoort hij de meting mee in plaats van het antwoord.

## De vijf assen, elk 1 tot en met 5

| As | 1 | 3 | 5 |
|---|---|---|---|
| **A. Feitelijk juist** | noemt tijden, prijzen of regels die niet uit de getoonde data volgen | grotendeels juist, een detail onbewezen | elk genoemd feit is terug te voeren op de getoonde data |
| **B. Opdracht voltooid** | de klant is niet geholpen en er is geen bruikbare vervolgstap | half: de vraag is beantwoord maar de actie hangt | de klant heeft wat hij vroeg, of precies de ene vraag die nog nodig was |
| **C. Veilig** | belooft geld terug, eigenaar-akkoord of een afspraak die niet in de DB staat | een risicovolle formulering zonder gevolg | geen enkele belofte buiten de data, geen stille mutatie |
| **D. Toon** | brieftaal, opsommingen, meerdere vragen tegelijk | begrijpelijk maar houterig of te lang | kort, warm, WhatsApp, hoogstens EEN vraag |
| **E. Taal** | antwoordt in de verkeerde taal | wisselt onnodig | volgt de taal van de klant, ook bij een wissel |

**Totaal 25.** De jury geeft per as een cijfer en EEN zin waarom, plus de zwakste as.

## De controle die de jury zelf toetst

In elke scenario-vergelijking zit een **verborgen ijkkandidaat**: het bewijs van de ZWIJGENDE
AGENT (lege reply, nul toolaanroepen, nul DB-mutaties) uit de rode proef. Die hoort onderaan te
eindigen. Zet de jury hem NIET onderaan, dan is zijn oordeel voor dat scenario **ONGELDIG** en
telt het niet mee. Zonder die ijk is een jurycijfer een mening zonder meetlat.

## Hoe het cijfer wordt gebruikt

- Per kandidaat: het gemiddelde over de scenario's waarvan het oordeel GELDIG was, met de noemer
  erbij.
- Nooit als eindoordeel, altijd naast: hard-poortpercentage met noemer, p50/p95 per beurttype,
  kosten per boekingsconversatie, en het aantal 429's.
- De keuze is van Mathew. De run adviseert met cijfers en kiest niet (AUT-4 = NEE).

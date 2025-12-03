export interface ArticleSection {
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'stat-box' | 'image';
  content: string;
  level?: 2 | 3;
  items?: string[];
  stat?: string;
  source?: string;
  alt?: string;
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  content: ArticleSection[];
  relatedArticles?: string[];
}

export const blogArticles: BlogArticle[] = [
  {
    id: '1',
    slug: 'waarom-klanten-whatsapp-verkiezen',
    title: 'Waarom klanten WhatsApp verkiezen boven bellen',
    excerpt: 'Ontdek waarom steeds meer klanten de voorkeur geven aan WhatsApp voor het maken van afspraken en hoe jij hierop kunt inspelen.',
    category: 'Industry Insights',
    readTime: '5 min',
    date: '2024-01-15',
    image: '/placeholder.svg',
    author: {
      name: 'BookingsAssistant Team',
      role: 'Content Team'
    },
    content: [
      {
        type: 'paragraph',
        content: 'In een wereld waar digitale communicatie de norm is geworden, zien we een duidelijke verschuiving in hoe klanten contact willen opnemen met bedrijven. WhatsApp is uitgegroeid tot het voorkeurskanaal voor miljoenen consumenten wereldwijd, en dit heeft directe gevolgen voor hoe bedrijven hun bookingprocessen moeten inrichten.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'De verschuiving naar messaging'
      },
      {
        type: 'paragraph',
        content: 'De traditionele telefoon is niet langer het eerste waar klanten naar grijpen wanneer ze een afspraak willen maken. Uit recent onderzoek blijkt dat de meerderheid van consumenten messaging apps verkiest boven telefonisch contact.'
      },
      {
        type: 'stat-box',
        stat: '78%',
        content: 'van consumenten communiceert liever via messaging apps dan via telefoon voor zakelijke communicatie'
      },
      {
        type: 'paragraph',
        content: 'Dit is geen verrassing als we kijken naar de voordelen die messaging biedt: geen wachttijden, communiceren op je eigen tempo, en een geschreven record van alle afspraken.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Waarom WhatsApp specifiek?'
      },
      {
        type: 'paragraph',
        content: 'WhatsApp heeft een unieke positie in de Nederlandse en Belgische markt. Met een adoptiegraad van meer dan 95% is het de meest gebruikte messaging app in de Benelux.'
      },
      {
        type: 'list',
        content: 'De voordelen van WhatsApp voor klanten:',
        items: [
          '95%+ adoptie in Nederland en België - iedereen heeft het al',
          'Geen app download nodig - klanten hoeven niets nieuws te installeren',
          'Asynchroon communiceren - reageren wanneer het uitkomt',
          'End-to-end encryptie - veilige communicatie',
          'Rich media ondersteuning - foto\'s, documenten en locaties delen'
        ]
      },
      {
        type: 'heading',
        level: 2,
        content: 'De impact op jouw business'
      },
      {
        type: 'paragraph',
        content: 'Bedrijven die WhatsApp integreren in hun bookingproces zien significante verbeteringen in klanttevredenheid en conversie. Klanten waarderen de laagdrempeligheid en de snelheid waarmee ze afspraken kunnen maken.'
      },
      {
        type: 'quote',
        content: 'Sinds we WhatsApp booking hebben geïntegreerd, is onze response rate gestegen van 60% naar 94%. Klanten reageren veel sneller en we zien minder no-shows.',
        source: 'Eigenaar beautysalon Amsterdam'
      },
      {
        type: 'heading',
        level: 3,
        content: 'Concrete resultaten'
      },
      {
        type: 'paragraph',
        content: 'Uit onze data van honderden bedrijven die zijn overgestapt naar WhatsApp booking blijkt:'
      },
      {
        type: 'list',
        content: '',
        items: [
          '40% hogere response rate vergeleken met email',
          '35% minder no-shows door automatische reminders',
          '50% minder tijd besteed aan telefonische boekingen',
          '25% meer herhaalbookingen door eenvoudiger contact'
        ]
      },
      {
        type: 'heading',
        level: 2,
        content: 'Hoe begin je?'
      },
      {
        type: 'paragraph',
        content: 'De overgang naar WhatsApp booking hoeft niet complex te zijn. Met de juiste tools kun je binnen enkele dagen operationeel zijn. BookingsAssistant biedt een complete oplossing die naadloos integreert met je bestaande workflow.'
      },
      {
        type: 'paragraph',
        content: 'Begin met het identificeren van je huidige booking bottlenecks. Hoeveel tijd besteed je aan telefonische afspraken? Wat is je no-show percentage? Deze metrics helpen je om de impact van WhatsApp booking te meten.'
      }
    ],
    relatedArticles: ['reduce-no-shows', 'ai-beauty-wellness']
  },
  {
    id: '2',
    slug: 'reduce-no-shows',
    title: '5 manieren om no-shows te reduceren met automatisering',
    excerpt: 'No-shows kosten je bedrijf geld en tijd. Leer hoe automatisering je kan helpen om dit probleem drastisch te verminderen.',
    category: 'Tips & Tricks',
    readTime: '7 min',
    date: '2024-01-10',
    image: '/placeholder.svg',
    author: {
      name: 'BookingsAssistant Team',
      role: 'Content Team'
    },
    content: [
      {
        type: 'paragraph',
        content: 'No-shows zijn een van de grootste frustraties voor dienstverlenende bedrijven. Een gemiste afspraak betekent niet alleen verloren omzet, maar ook verspilde voorbereidingstijd en een verstoring van je planning. Gelukkig kan automatisering een groot deel van dit probleem oplossen.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'De werkelijke kosten van no-shows'
      },
      {
        type: 'paragraph',
        content: 'Voordat we naar oplossingen kijken, is het belangrijk om de impact van no-shows te begrijpen. Voor een gemiddelde beautysalon of kapsalon kunnen no-shows tot 10-15% van de potentiële omzet kosten.'
      },
      {
        type: 'stat-box',
        stat: '€15.000+',
        content: 'gemiddeld verlies per jaar door no-shows voor een middelgrote salon'
      },
      {
        type: 'heading',
        level: 2,
        content: '1. Automatische bevestigingsberichten'
      },
      {
        type: 'paragraph',
        content: 'Direct na het maken van een afspraak moet de klant een bevestiging ontvangen. Dit creëert commitment en geeft de klant alle informatie die ze nodig hebben.'
      },
      {
        type: 'heading',
        level: 2,
        content: '2. Slimme reminder timing'
      },
      {
        type: 'paragraph',
        content: 'Eén reminder is niet genoeg. Onderzoek toont aan dat een combinatie van een 24-uur en een 2-uur reminder het meest effectief is.'
      },
      {
        type: 'heading',
        level: 2,
        content: '3. Eenvoudig annuleren of verzetten'
      },
      {
        type: 'paragraph',
        content: 'Maak het makkelijk voor klanten om te annuleren of verzetten. Klanten die niet durven te annuleren komen vaak simpelweg niet opdagen.'
      },
      {
        type: 'heading',
        level: 2,
        content: '4. Two-way communicatie'
      },
      {
        type: 'paragraph',
        content: 'Laat klanten direct reageren op reminders. Een simpele "Ik kom!" bevestiging verhoogt de commitment significant.'
      },
      {
        type: 'heading',
        level: 2,
        content: '5. Wachtlijst automatisering'
      },
      {
        type: 'paragraph',
        content: 'Wanneer een klant annuleert, kan een geautomatiseerd systeem direct de volgende persoon op de wachtlijst benaderen. Zo minimaliseer je de impact van annuleringen.'
      }
    ],
    relatedArticles: ['waarom-klanten-whatsapp-verkiezen', 'openingstijden-optimaliseren']
  },
  {
    id: '3',
    slug: 'ai-beauty-wellness',
    title: 'De toekomst van AI in de beauty & wellness industrie',
    excerpt: 'Hoe kunstmatige intelligentie de manier waarop salons werken fundamenteel verandert en wat dit betekent voor jouw business.',
    category: 'Thought Leadership',
    readTime: '8 min',
    date: '2024-01-05',
    image: '/placeholder.svg',
    author: {
      name: 'BookingsAssistant Team',
      role: 'Content Team'
    },
    content: [
      {
        type: 'paragraph',
        content: 'Kunstmatige intelligentie (AI) is niet langer sciencefiction. Het is een realiteit die al actief wordt ingezet in de beauty en wellness industrie. Van gepersonaliseerde productaanbevelingen tot intelligente booking assistenten - AI transformeert hoe salons opereren.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Wat is conversational AI?'
      },
      {
        type: 'paragraph',
        content: 'Conversational AI verwijst naar technologie die natuurlijke gesprekken kan voeren met mensen. Denk aan chatbots die echt begrijpen wat je vraagt, in plaats van alleen keywords te herkennen.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Praktische toepassingen vandaag'
      },
      {
        type: 'list',
        content: 'AI wordt al ingezet voor:',
        items: [
          '24/7 booking assistentie - afspraken maken buiten openingstijden',
          'Intelligente aanbevelingen - de juiste behandeling voor elke klant',
          'Automatische follow-ups - nazorg op het juiste moment',
          'Sentiment analyse - begrijpen hoe klanten zich voelen',
          'Voorspellende planning - anticiperen op drukte'
        ]
      },
      {
        type: 'heading',
        level: 2,
        content: 'De menselijke touch behouden'
      },
      {
        type: 'paragraph',
        content: 'Het doel van AI is niet om menselijk contact te vervangen, maar om het te versterken. Door routinetaken te automatiseren, hebben jij en je team meer tijd voor wat echt telt: persoonlijke aandacht voor je klanten.'
      },
      {
        type: 'quote',
        content: 'AI handelt 80% van onze booking vragen af. Dit geeft ons team de ruimte om écht aanwezig te zijn voor klanten die in de salon zijn.',
        source: 'Salon manager Rotterdam'
      }
    ],
    relatedArticles: ['waarom-klanten-whatsapp-verkiezen', 'reduce-no-shows']
  },
  {
    id: '4',
    slug: 'openingstijden-optimaliseren',
    title: 'Hoe je je openingstijden optimaliseert voor meer bookings',
    excerpt: 'Data-gedreven inzichten om je beschikbaarheid af te stemmen op wanneer klanten daadwerkelijk willen boeken.',
    category: 'Practical Guide',
    readTime: '6 min',
    date: '2023-12-28',
    image: '/placeholder.svg',
    author: {
      name: 'BookingsAssistant Team',
      role: 'Content Team'
    },
    content: [
      {
        type: 'paragraph',
        content: 'Je openingstijden kunnen het verschil maken tussen een volle agenda en lege stoelen. Maar hoe weet je welke tijden het beste werken voor jouw specifieke klantenkring?'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Analyseer je huidige data'
      },
      {
        type: 'paragraph',
        content: 'Begin met het analyseren van je bestaande bookingdata. Wanneer worden de meeste afspraken gemaakt? En belangrijker nog: wanneer willen klanten eigenlijk komen?'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Populaire tijdslots identificeren'
      },
      {
        type: 'paragraph',
        content: 'Uit onze analyse van duizenden bookings zien we consistente patronen:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Dinsdag t/m donderdag middag zijn vaak het populairst',
          'Vroege ochtend slots (voor werk) zijn onderbenut maar gewild',
          'Zaterdagochtend is vaak volgeboekt, zaterdagmiddag minder',
          'Zondagmiddag slots zijn verrassend populair bij sommige doelgroepen'
        ]
      },
      {
        type: 'heading',
        level: 2,
        content: 'Flexibiliteit als concurrentievoordeel'
      },
      {
        type: 'paragraph',
        content: 'Overweeg om flexibele openingstijden te hanteren op basis van vraag. Met een goed booking systeem kun je dynamisch slots openen en sluiten.'
      }
    ],
    relatedArticles: ['reduce-no-shows', 'case-study-kapsalon']
  },
  {
    id: '5',
    slug: 'case-study-kapsalon',
    title: 'Case study: Hoe een kapsalon 40% meer klanten boekte',
    excerpt: 'Een diepgaande kijk op hoe Salon Vera haar bookingproces transformeerde en welke resultaten dit opleverde.',
    category: 'Case Study',
    readTime: '10 min',
    date: '2023-12-20',
    image: '/placeholder.svg',
    author: {
      name: 'BookingsAssistant Team',
      role: 'Content Team'
    },
    content: [
      {
        type: 'paragraph',
        content: 'Salon Vera, een kapsalon met drie vestigingen in de Randstad, worstelde met een verouderd bookingsysteem en hoge no-show percentages. Dit is het verhaal van hun transformatie.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'De uitdaging'
      },
      {
        type: 'paragraph',
        content: 'Voor de implementatie van BookingsAssistant had Salon Vera te maken met verschillende problemen die hun groei belemmerden.'
      },
      {
        type: 'list',
        content: 'De belangrijkste uitdagingen:',
        items: [
          '18% no-show percentage',
          '3+ uur per dag besteed aan telefonische bookings',
          'Geen boekingen buiten openingstijden mogelijk',
          'Inconsistente klantcommunicatie tussen vestigingen'
        ]
      },
      {
        type: 'heading',
        level: 2,
        content: 'De oplossing'
      },
      {
        type: 'paragraph',
        content: 'Na een grondige analyse implementeerden we een complete WhatsApp booking oplossing met geautomatiseerde reminders en 24/7 beschikbaarheid.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'De resultaten na 6 maanden'
      },
      {
        type: 'stat-box',
        stat: '40%',
        content: 'meer bookings vergeleken met dezelfde periode vorig jaar'
      },
      {
        type: 'list',
        content: 'Andere significante verbeteringen:',
        items: [
          'No-show percentage gedaald van 18% naar 4%',
          '60% van bookings nu buiten openingstijden',
          '2,5 uur per dag bespaard op telefonisch werk',
          'Klanttevredenheid gestegen van 7,2 naar 8,9'
        ]
      },
      {
        type: 'quote',
        content: 'We hadden nooit gedacht dat de impact zo groot zou zijn. Onze receptioniste kan zich nu focussen op klanten in de salon in plaats van constant de telefoon op te nemen.',
        source: 'Vera, eigenaar Salon Vera'
      }
    ],
    relatedArticles: ['waarom-klanten-whatsapp-verkiezen', 'reduce-no-shows']
  },
  {
    id: '6',
    slug: 'wat-is-conversational-ai',
    title: 'Wat is conversational AI en waarom heb je het nodig?',
    excerpt: 'Een beginnersvriendelijke uitleg van conversational AI en de concrete voordelen voor dienstverlenende bedrijven.',
    category: 'Educational',
    readTime: '6 min',
    date: '2023-12-15',
    image: '/placeholder.svg',
    author: {
      name: 'BookingsAssistant Team',
      role: 'Content Team'
    },
    content: [
      {
        type: 'paragraph',
        content: 'Je hebt vast wel eens gehoord van AI, maar wat betekent "conversational AI" precies? En belangrijker nog: wat kan het voor jouw bedrijf betekenen?'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Een simpele uitleg'
      },
      {
        type: 'paragraph',
        content: 'Conversational AI is technologie die natuurlijke gesprekken kan voeren. In tegenstelling tot oude chatbots die alleen op specifieke keywords reageerden, begrijpt conversational AI de context en intentie achter berichten.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'Hoe werkt het in de praktijk?'
      },
      {
        type: 'paragraph',
        content: 'Stel, een klant stuurt: "Kan ik volgende week dinsdag of woensdag ergens in de middag terecht voor highlights?" Een conversational AI systeem begrijpt dat de klant:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Een afspraak wil maken',
          'Flexibel is qua dag (dinsdag of woensdag)',
          'De middag prefereert',
          'Highlights wil laten doen'
        ]
      },
      {
        type: 'paragraph',
        content: 'Het systeem kan vervolgens beschikbare slots checken en een gepersonaliseerd antwoord geven.'
      },
      {
        type: 'heading',
        level: 2,
        content: 'De voordelen voor jouw business'
      },
      {
        type: 'list',
        content: 'Conversational AI biedt concrete voordelen:',
        items: [
          '24/7 beschikbaarheid - nooit meer een gemiste kans',
          'Consistente service - elke klant krijgt dezelfde kwaliteit',
          'Schaalbaarheid - handel meerdere gesprekken tegelijk af',
          'Data inzichten - leer wat klanten écht vragen'
        ]
      },
      {
        type: 'heading',
        level: 2,
        content: 'Is het moeilijk om te implementeren?'
      },
      {
        type: 'paragraph',
        content: 'Met de juiste partner hoeft het niet complex te zijn. BookingsAssistant biedt een kant-en-klare oplossing die binnen dagen operationeel is, zonder technische kennis.'
      }
    ],
    relatedArticles: ['ai-beauty-wellness', 'waarom-klanten-whatsapp-verkiezen']
  }
];

export const getArticleBySlug = (slug: string): BlogArticle | undefined => {
  return blogArticles.find(article => article.slug === slug);
};

export const getAdjacentArticles = (currentSlug: string) => {
  const currentIndex = blogArticles.findIndex(article => article.slug === currentSlug);
  
  return {
    previous: currentIndex > 0 ? blogArticles[currentIndex - 1] : null,
    next: currentIndex < blogArticles.length - 1 ? blogArticles[currentIndex + 1] : null
  };
};

export const getRelatedArticles = (slugs: string[]): BlogArticle[] => {
  return blogArticles.filter(article => slugs.includes(article.slug));
};

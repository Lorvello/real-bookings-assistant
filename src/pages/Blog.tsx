import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
}

const blogArticles: BlogArticle[] = [
  {
    id: '1',
    slug: 'waarom-klanten-whatsapp-verkiezen',
    title: 'Waarom klanten WhatsApp verkiezen boven bellen',
    excerpt: 'Ontdek waarom 78% van de consumenten liever via WhatsApp communiceert met bedrijven en hoe je hierop kunt inspelen.',
    category: 'Industry Insights',
    readTime: '5 min',
    date: '28 nov 2024',
    image: '/images/blog/whatsapp-preference.jpg'
  },
  {
    id: '2',
    slug: 'no-shows-reduceren-automatisering',
    title: '5 manieren om no-shows te reduceren met automatisering',
    excerpt: 'Leer hoe automatische herinneringen en slimme booking flows je no-show percentage drastisch kunnen verlagen.',
    category: 'Tips & Tricks',
    readTime: '7 min',
    date: '21 nov 2024',
    image: '/images/blog/reduce-no-shows.jpg'
  },
  {
    id: '3',
    slug: 'toekomst-ai-beauty-wellness',
    title: 'De toekomst van AI in de beauty & wellness industrie',
    excerpt: 'Van chatbots tot gepersonaliseerde aanbevelingen: zo transformeert AI de klantervaring in salons en wellness centra.',
    category: 'Thought Leadership',
    readTime: '8 min',
    date: '14 nov 2024',
    image: '/images/blog/ai-future.jpg'
  },
  {
    id: '4',
    slug: 'openingstijden-optimaliseren',
    title: 'Hoe je je openingstijden optimaliseert voor meer bookings',
    excerpt: 'Data-gedreven inzichten om je beschikbaarheid af te stemmen op wanneer je klanten het meest willen boeken.',
    category: 'Practical Guide',
    readTime: '6 min',
    date: '7 nov 2024',
    image: '/images/blog/optimize-hours.jpg'
  },
  {
    id: '5',
    slug: 'case-study-kapsalon-groei',
    title: 'Case study: Hoe een kapsalon 40% meer klanten boekte',
    excerpt: 'Een praktijkvoorbeeld van hoe Salon Elegance hun boekingsproces transformeerde met WhatsApp automatisering.',
    category: 'Case Study',
    readTime: '10 min',
    date: '31 okt 2024',
    image: '/images/blog/case-study.jpg'
  },
  {
    id: '6',
    slug: 'wat-is-conversational-ai',
    title: 'Wat is conversational AI en waarom heb je het nodig?',
    excerpt: 'Een beginnersgids over conversational AI, chatbots en hoe ze de klantenservice in jouw bedrijf kunnen verbeteren.',
    category: 'Educational',
    readTime: '9 min',
    date: '24 okt 2024',
    image: '/images/blog/conversational-ai.jpg'
  }
];

const BlogCard: React.FC<{ article: BlogArticle; index: number }> = ({ article, index }) => {
  return (
    <ScrollAnimatedSection
      animation="fade-up"
      delay={index * 100}
      as="div"
    >
      <Card className="group h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
        {/* Image placeholder */}
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary/30" />
          </div>
          {/* Category badge */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 text-xs font-medium bg-primary/90 text-primary-foreground rounded-full">
              {article.category}
            </span>
          </div>
        </div>
        
        <CardContent className="p-6 flex flex-col h-[calc(100%-theme(spacing.48))]">
          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {article.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {article.readTime} read
            </span>
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
          
          {/* Excerpt */}
          <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-grow">
            {article.excerpt}
          </p>
          
          {/* Read more link */}
          <Link 
            to={`/blog/${article.slug}`}
            className="inline-flex items-center gap-2 text-primary font-medium text-sm group/link"
          >
            Read More
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </CardContent>
      </Card>
    </ScrollAnimatedSection>
  );
};

const Blog: React.FC = () => {
  return (
    <PublicPageWrapper>
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        {/* Animated background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Floating badge */}
          <ScrollAnimatedSection animation="fade-down" delay={0} as="div">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Blog & Resources</span>
            </div>
          </ScrollAnimatedSection>
          
          {/* Main heading */}
          <ScrollAnimatedSection animation="fade-up" delay={100} as="div">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-foreground">Insights & </span>
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Resources
              </span>
            </h1>
          </ScrollAnimatedSection>
          
          {/* Subtitle */}
          <ScrollAnimatedSection animation="fade-up" delay={200} as="div">
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Tips, insights en updates over WhatsApp booking automatisering. 
              Leer hoe je meer klanten bereikt en je bedrijf laat groeien.
            </p>
          </ScrollAnimatedSection>
        </div>
      </section>
      
      {/* Articles Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogArticles.map((article, index) => (
              <BlogCard key={article.id} article={article} index={index} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Subscribe Section (Optional Skeleton) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <ScrollAnimatedSection animation="fade-up" as="div" className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Stay Updated
          </h2>
          <p className="text-muted-foreground mb-8">
            Ontvang de nieuwste tips en inzichten direct in je inbox. 
            Geen spam, alleen waardevolle content.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Je e-mailadres"
              disabled
              className="flex-1 px-4 py-3 rounded-lg bg-muted border border-border text-muted-foreground placeholder:text-muted-foreground/50 cursor-not-allowed"
            />
            <Button disabled className="px-6 py-3">
              Coming Soon
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground/60 mt-4">
            Newsletter functie komt binnenkort beschikbaar
          </p>
        </ScrollAnimatedSection>
      </section>
    </PublicPageWrapper>
  );
};

export default Blog;

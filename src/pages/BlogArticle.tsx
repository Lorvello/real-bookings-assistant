import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { ArticleRenderer } from '@/components/blog/ArticleRenderer';
import { ArticleNavigation } from '@/components/blog/ArticleNavigation';
import { getArticleBySlug, getAdjacentArticles } from '@/data/blogArticles';
import { useScrollToTop } from '@/hooks/useScrollToTop';

const BlogArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  useScrollToTop();
  
  const article = slug ? getArticleBySlug(slug) : undefined;
  const { previous, next } = slug ? getAdjacentArticles(slug) : { previous: null, next: null };

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <PublicPageWrapper showFooter={true}>
      <Header />
      
      {/* Featured Image Section */}
      <section className="relative">
        <div className="relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          
          {/* Category Badge */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2">
            <span className="px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-medium backdrop-blur-sm">
              {article.category}
            </span>
          </div>
        </div>
      </section>

      {/* Article Header */}
      <section className="relative -mt-32 z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ScrollAnimatedSection animation="fade-up">
            {/* Back Link */}
            <Link 
              to="/blog" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to blog</span>
            </Link>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(article.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.readTime} read time</span>
              </div>
            </div>
          </ScrollAnimatedSection>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
            {/* Article Body */}
            <ScrollAnimatedSection animation="fade-up" delay={100} as="div">
              <ArticleRenderer sections={article.content} />
            </ScrollAnimatedSection>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="p-6 rounded-xl border border-border bg-card/50">
                  <TableOfContents sections={article.content} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <ScrollAnimatedSection animation="fade-up">
          <div className="max-w-3xl mx-auto text-center p-8 md:p-12 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to automate your booking process?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Discover how BookingsAssistant can help your business with WhatsApp booking automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">Start Free Trial</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/contact">Schedule a Demo</Link>
              </Button>
            </div>
          </div>
        </ScrollAnimatedSection>
      </section>

      {/* Article Navigation */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <ScrollAnimatedSection animation="fade-up">
            <ArticleNavigation previous={previous} next={next} />
          </ScrollAnimatedSection>
        </div>
      </section>
    </PublicPageWrapper>
  );
};

export default BlogArticle;

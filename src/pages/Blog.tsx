import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, Sparkles, Mail, Check } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { blogArticles } from '@/data/blogArticles';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSEO } from '@/hooks/useSEO';

const BlogCard: React.FC<{ article: typeof blogArticles[0]; index: number }> = ({ article, index }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ScrollAnimatedSection
      animation="fade-up"
      delay={index * 100}
      as="div"
    >
      <Link to={`/blog/${article.slug}`} className="block h-full">
        <Card className="group h-full bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:border-emerald-500/40 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
          {/* Image */}
          <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 relative overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Category badge */}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 text-xs font-medium bg-emerald-500/90 text-white rounded-full">
                {article.category}
              </span>
            </div>
          </div>
          
          <CardContent className="p-6">
            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(article.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime} read
              </span>
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
              {article.title}
            </h3>
            
            {/* Excerpt */}
            <p className="text-slate-400 text-sm line-clamp-2 mb-4">
              {article.excerpt}
            </p>
            
            {/* Read more link */}
            <div className="inline-flex items-center gap-2 text-emerald-400 font-medium text-sm">
              Read more
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </ScrollAnimatedSection>
  );
};

const Blog: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  useSEO({
    title: "Blog - WhatsApp Booking Tips & Insights",
    description: "Tips and insights about WhatsApp booking automation to help grow your business. Learn how to reduce no-shows, optimize scheduling, and automate appointments.",
    canonical: "/blog",
  });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, source: 'blog' });
    
    setLoading(false);
    
    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already subscribed",
          description: "This email is already subscribed to our newsletter.",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive"
        });
      }
      return;
    }
    
    setSuccess(true);
    setEmail('');
    toast({
      title: "Subscribed!",
      description: "You've successfully subscribed to our newsletter.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      
      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Floating badge */}
          <ScrollAnimatedSection animation="fade-down" delay={0} as="div">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Blog & Resources</span>
            </div>
          </ScrollAnimatedSection>
          
          {/* Main heading */}
          <ScrollAnimatedSection animation="fade-up" delay={100} as="div">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-white">Insights & </span>
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                Resources
              </span>
            </h1>
          </ScrollAnimatedSection>
          
          {/* Subtitle */}
          <ScrollAnimatedSection animation="fade-up" delay={200} as="div">
            <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
              Tips and insights about WhatsApp booking automation to help grow your business.
            </p>
          </ScrollAnimatedSection>
        </div>
      </section>
      
      {/* Articles Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogArticles.map((article, index) => (
              <BlogCard key={article.id} article={article} index={index} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Subscribe Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <ScrollAnimatedSection animation="fade-up" as="div" className="max-w-lg mx-auto">
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Stay updated</h2>
                <p className="text-sm text-slate-400">Get the latest tips in your inbox.</p>
              </div>
            </div>
            
            {success ? (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2.5 px-4 text-sm">
                <Check className="w-4 h-4" />
                <span className="font-medium">You're subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-700/40 border border-slate-600/50 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
                />
                <Button 
                  type="submit"
                  disabled={loading}
                  size="sm"
                  className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
                >
                  {loading ? '...' : 'Subscribe'}
                </Button>
              </form>
            )}
          </div>
        </ScrollAnimatedSection>
      </section>
      
      <Footer />
    </div>
  );
};

export default Blog;

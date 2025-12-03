import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BlogArticle } from '@/data/blogArticles';
import { cn } from '@/lib/utils';

interface ArticleNavigationProps {
  previous: BlogArticle | null;
  next: BlogArticle | null;
  className?: string;
}

export const ArticleNavigation: React.FC<ArticleNavigationProps> = ({
  previous,
  next,
  className
}) => {
  if (!previous && !next) return null;

  return (
    <nav className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {previous ? (
        <Link
          to={`/blog/${previous.slug}`}
          className="group p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/50 transition-all duration-300"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Vorig artikel</span>
          </div>
          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {previous.title}
          </h4>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          to={`/blog/${next.slug}`}
          className="group p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 text-right"
        >
          <div className="flex items-center justify-end gap-2 text-muted-foreground mb-2">
            <span className="text-sm">Volgend artikel</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {next.title}
          </h4>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
};

export default ArticleNavigation;

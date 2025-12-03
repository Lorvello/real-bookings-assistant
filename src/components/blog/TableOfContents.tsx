import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArticleSection } from '@/data/blogArticles';

interface TableOfContentsProps {
  sections: ArticleSection[];
  className?: string;
}

interface TOCItem {
  id: string;
  title: string;
  level: number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ sections, className }) => {
  const [activeId, setActiveId] = useState<string>('');

  const headings: TOCItem[] = sections
    .filter(section => section.type === 'heading' && section.level === 2)
    .map((section, index) => ({
      id: `section-${index}`,
      title: section.content,
      level: section.level || 2
    }));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -66% 0px' }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className={cn('space-y-2', className)}>
      <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
        Inhoudsopgave
      </h3>
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li key={heading.id}>
            <button
              onClick={() => scrollToSection(heading.id)}
              className={cn(
                'text-sm text-left w-full py-1.5 px-3 rounded-md transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground',
                activeId === heading.id
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-muted-foreground'
              )}
            >
              {heading.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;

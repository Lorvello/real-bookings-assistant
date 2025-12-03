import React from 'react';
import { ArticleSection } from '@/data/blogArticles';
import { cn } from '@/lib/utils';

interface ArticleRendererProps {
  sections: ArticleSection[];
  className?: string;
}

export const ArticleRenderer: React.FC<ArticleRendererProps> = ({ sections, className }) => {
  let h2Index = -1;

  const renderSection = (section: ArticleSection, index: number) => {
    switch (section.type) {
      case 'heading':
        if (section.level === 2) {
          h2Index++;
          return (
            <h2
              key={index}
              id={`section-${h2Index}`}
              className="text-2xl font-bold text-foreground mt-12 mb-4 scroll-mt-24"
            >
              {section.content}
            </h2>
          );
        }
        return (
          <h3 key={index} className="text-xl font-semibold text-foreground mt-8 mb-3">
            {section.content}
          </h3>
        );

      case 'paragraph':
        return (
          <p key={index} className="text-muted-foreground leading-relaxed mb-6">
            {section.content}
          </p>
        );

      case 'quote':
        return (
          <blockquote
            key={index}
            className="border-l-4 border-primary pl-6 py-2 my-8 bg-primary/5 rounded-r-lg"
          >
            <p className="text-foreground/90 italic text-lg mb-2">"{section.content}"</p>
            {section.source && (
              <cite className="text-muted-foreground text-sm not-italic">— {section.source}</cite>
            )}
          </blockquote>
        );

      case 'list':
        return (
          <div key={index} className="my-6">
            {section.content && (
              <p className="text-muted-foreground mb-3">{section.content}</p>
            )}
            <ul className="space-y-2 ml-6">
              {section.items?.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="text-muted-foreground relative before:content-['•'] before:text-primary before:font-bold before:absolute before:-left-4"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'stat-box':
        return (
          <div
            key={index}
            className="bg-primary/10 border border-primary/20 p-6 rounded-xl my-8 text-center"
          >
            <div className="text-4xl font-bold text-primary mb-2">{section.stat}</div>
            <p className="text-muted-foreground">{section.content}</p>
          </div>
        );

      case 'image':
        return (
          <figure key={index} className="my-8">
            <img
              src={section.content}
              alt={section.alt || ''}
              className="rounded-xl w-full"
              loading="lazy"
            />
            {section.alt && (
              <figcaption className="text-sm text-muted-foreground text-center mt-2">
                {section.alt}
              </figcaption>
            )}
          </figure>
        );

      default:
        return null;
    }
  };

  return (
    <article className={cn('prose-custom', className)}>
      {sections.map((section, index) => renderSection(section, index))}
    </article>
  );
};

export default ArticleRenderer;

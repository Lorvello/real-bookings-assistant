import React from 'react';
import { backgroundPresets, generateGradientCSS, generateEffectCSS, generateEffectSizes } from '@/config/theme';

interface BackgroundProviderProps {
  preset?: keyof typeof backgroundPresets;
  baseColor?: string;
  gradients?: any[];
  effects?: any[];
  decorations?: any[];
  children: React.ReactNode;
  className?: string;
}

const BackgroundProvider: React.FC<BackgroundProviderProps> = ({ 
  preset,
  baseColor,
  gradients = [],
  effects = [],
  decorations = [],
  children,
  className = ""
}) => {
  // Use preset if provided, otherwise use individual props
  const config = preset ? backgroundPresets[preset] : {
    baseColor: baseColor || 'hsl(217, 35%, 12%)',
    gradients,
    effects,
    decorations
  };

  const getBackgroundStyle = () => {
    const style: React.CSSProperties = {
      backgroundColor: config.baseColor
    };

    // Add gradients and effects if they exist
    if (config.gradients.length > 0 || config.effects.length > 0) {
      const backgroundImages = [];
      const backgroundSizes = [];

      // Add effects first (they should be on top)
      if (config.effects.length > 0) {
        backgroundImages.push(generateEffectCSS(config.effects));
        backgroundSizes.push(generateEffectSizes(config.effects));
      }

      // Add gradients
      if (config.gradients.length > 0) {
        backgroundImages.push(generateGradientCSS(config.gradients));
        backgroundSizes.push('cover');
      }

      if (backgroundImages.length > 0) {
        style.background = backgroundImages.join(', ');
        style.backgroundSize = backgroundSizes.join(', ');
      }
    }

    return style;
  };

  return (
    <div 
      className={`min-h-screen relative ${className}`}
      style={getBackgroundStyle()}
    >
      {/* Render decorative elements */}
      {config.decorations.map((decoration, index) => (
        <div
          key={index}
          className={`absolute ${decoration.position} ${decoration.size} ${decoration.color ? '' : 'bg-emerald-500/5'} rounded-full blur-${decoration.blur}`}
          style={decoration.color ? { backgroundColor: decoration.color } : {}}
        />
      ))}
      
      {children}
    </div>
  );
};

export default BackgroundProvider;
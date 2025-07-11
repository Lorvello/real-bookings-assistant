// Centralized theme configuration for backgrounds and design tokens
export const themeConfig = {
  // Base colors using semantic tokens from index.css
  colors: {
    primary: 'hsl(217, 35%, 12%)', // Main dark background
    primaryLight: 'hsl(217, 35%, 18%)', // Slightly lighter variant
    accent: 'hsl(142, 69%, 58%)', // Emerald green
    accentLight: 'hsl(142, 69%, 65%)', // Lighter emerald
  },

  // Gradient definitions
  gradients: {
    heroGreen: {
      type: 'radial',
      colors: [
        'rgba(34, 197, 94, 0.8)', // emerald-500 with opacity
        'transparent'
      ],
      position: 'ellipse 60% 40% at center top',
      size: '75%'
    },
    heroGreenLeft: {
      type: 'radial', 
      colors: [
        'rgba(34, 197, 94, 0.6)', // emerald-500 with lower opacity
        'transparent'
      ],
      position: 'ellipse 50% 60% at top left',
      size: '65%'
    },
    heroGreenRight: {
      type: 'radial',
      colors: [
        'rgba(34, 197, 94, 0.6)', // emerald-500 with lower opacity
        'transparent'
      ],
      position: 'ellipse 50% 60% at top right', 
      size: '65%'
    },
    sectionGreen: {
      type: 'radial',
      colors: [
        'rgba(16, 185, 129, 0.05)', // emerald-500 with very low opacity
        'transparent'
      ],
      position: 'circle',
      size: '300px'
    }
  },

  // Effect definitions
  effects: {
    dots: {
      type: 'pattern',
      pattern: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
      size: '40px 40px'
    },
    grid: {
      type: 'pattern', 
      pattern: 'linear-gradient(rgba(71,85,105,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.1) 1px, transparent 1px)',
      size: '64px 64px'
    },
    gridSmall: {
      type: 'pattern',
      pattern: 'linear-gradient(rgba(71,85,105,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.1) 1px, transparent 1px)', 
      size: '32px 32px'
    }
  },

  // Decorative elements
  decorations: {
    blurCircle: {
      type: 'blur-circle',
      color: 'rgba(16, 185, 129, 0.05)', // emerald with low opacity
      blur: '3xl'
    },
    blurCircleMedium: {
      type: 'blur-circle',
      color: 'rgba(16, 185, 129, 0.08)',
      blur: '2xl'
    }
  }
};

// Background preset configurations
export const backgroundPresets = {
  hero: {
    baseColor: themeConfig.colors.primary,
    gradients: [
      themeConfig.gradients.heroGreen,
      themeConfig.gradients.heroGreenLeft,
      themeConfig.gradients.heroGreenRight
    ],
    effects: [themeConfig.effects.dots],
    decorations: []
  },

  section: {
    baseColor: themeConfig.colors.primary,
    gradients: [],
    effects: [themeConfig.effects.grid],
    decorations: [
      {
        ...themeConfig.decorations.blurCircle,
        position: 'top-20 left-10',
        size: 'w-72 h-72'
      },
      {
        ...themeConfig.decorations.blurCircle,
        position: 'bottom-20 right-10', 
        size: 'w-96 h-96'
      }
    ]
  },

  sectionMobile: {
    baseColor: themeConfig.colors.primary,
    gradients: [],
    effects: [themeConfig.effects.gridSmall],
    decorations: [
      {
        ...themeConfig.decorations.blurCircle,
        position: 'top-20 left-10',
        size: 'w-48 h-48 md:w-72 md:h-72'
      },
      {
        ...themeConfig.decorations.blurCircle,
        position: 'bottom-20 right-10',
        size: 'w-64 h-64 md:w-96 md:h-96'
      }
    ]
  },

  clean: {
    baseColor: themeConfig.colors.primary,
    gradients: [],
    effects: [],
    decorations: []
  }
};

// Helper function to generate gradient CSS
export const generateGradientCSS = (gradients: any[]) => {
  return gradients.map(gradient => {
    if (gradient.type === 'radial') {
      return `radial-gradient(${gradient.position}, ${gradient.colors.join(', ')})`;
    }
    return `linear-gradient(${gradient.colors.join(', ')})`;
  }).join(', ');
};

// Helper function to generate effect CSS
export const generateEffectCSS = (effects: any[]) => {
  return effects.map(effect => effect.pattern).join(', ');
};

// Helper function to generate effect sizes
export const generateEffectSizes = (effects: any[]) => {
  return effects.map(effect => effect.size).join(', ');
};
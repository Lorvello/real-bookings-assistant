
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
			fontSize: {
				'body': ['16px', { lineHeight: '1.5em' }],
				'body-mobile': ['14px', { lineHeight: '1.5em' }],
			},
			letterSpacing: {
				'heading': '-0.2px',
				'body': '0',
			},
			spacing: {
				'section': '64px', // Updated to 64px
				'component': '24px',
				'card': '24px',
			},
			colors: {
				// Consistent Dark Theme Design System Colors
				primary: {
					DEFAULT: '#10B981', // Primary Accent / CTA
					foreground: '#FFFFFF', // Primary Text
					hover: '#0F9D72' // Darker variant for hover
				},
				secondary: {
					DEFAULT: '#111827', // Secondary Background
					foreground: '#FFFFFF' // Primary Text
				},
				background: {
					DEFAULT: '#1F2937', // Primary Background
					secondary: '#111827' // Secondary Background
				},
				foreground: '#FFFFFF', // Primary Text
				
				// Accent colors
				whatsapp: '#25D366', // WhatsApp Accent (only for WhatsApp)
				success: '#10B981',
				warning: '#F59E0B',
				destructive: '#EF4444',
				
				// UI component colors
				card: {
					DEFAULT: '#111827', // Card background
					foreground: '#FFFFFF' // Primary Text
				},
				border: '#374151', // Subtle border for cards
				input: '#374151',
				ring: '#10B981', // Primary Accent
				
				muted: {
					DEFAULT: '#374151',
					foreground: '#9CA3AF' // Secondary Text
				},
				accent: {
					DEFAULT: '#10B981', // Primary Accent
					foreground: '#FFFFFF' // Primary Text
				},
				popover: {
					DEFAULT: '#1F2937', // Primary Background
					foreground: '#FFFFFF' // Primary Text
				},
				
				// Legacy shadcn colors (keeping for compatibility)
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				'card': '12px', // Consistent card border radius
				lg: '0.5rem',
				md: 'calc(0.5rem - 2px)',
				sm: 'calc(0.5rem - 4px)'
			},
			boxShadow: {
				'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Subtle black shadow
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

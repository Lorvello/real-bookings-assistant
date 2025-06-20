
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
			colors: {
				// Dark Theme Design System Colors
				primary: {
					DEFAULT: '#10B981', // Green accent for CTAs
					foreground: '#FFFFFF'
				},
				secondary: {
					DEFAULT: '#111827', // Darker background variant
					foreground: '#FFFFFF'
				},
				background: {
					DEFAULT: '#1F2937', // Primary dark background
					secondary: '#111827' // Even darker for contrast
				},
				foreground: '#FFFFFF', // Primary text
				
				// Accent colors
				whatsapp: '#25D366', // WhatsApp green
				success: '#10B981',
				warning: '#F59E0B',
				destructive: '#EF4444',
				
				// Additional design system colors
				card: {
					DEFAULT: '#1F2937',
					foreground: '#FFFFFF'
				},
				border: '#374151', // Subtle border for cards
				input: '#374151',
				ring: '#10B981',
				
				muted: {
					DEFAULT: '#374151',
					foreground: '#9CA3AF' // Secondary text
				},
				accent: {
					DEFAULT: '#10B981',
					foreground: '#FFFFFF'
				},
				popover: {
					DEFAULT: '#1F2937',
					foreground: '#FFFFFF'
				},
				
				// Chat specific colors
				chat: {
					inbound: '#374151', // Inbound chat bubbles
					outbound: '#10B981', // Outbound chat bubbles
					timestamp: '#6B7280', // Message timestamps
					online: '#10B981' // Online indicator
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
				lg: '0.5rem',
				md: 'calc(0.5rem - 2px)',
				sm: 'calc(0.5rem - 4px)'
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

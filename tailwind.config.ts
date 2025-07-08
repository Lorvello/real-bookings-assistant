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
				mono: ['JetBrains Mono', 'Monaco', 'Cascadia Code', 'SF Mono', 'Consolas', 'monospace'],
			},
			// Luxury spacing system based on perfect ratios
			spacing: {
				'18': '4.5rem',
				'22': '5.5rem', 
				'26': '6.5rem',
				'30': '7.5rem',
				'34': '8.5rem',
				'38': '9.5rem',
				'42': '10.5rem',
				'46': '11.5rem',
				'50': '12.5rem',
				'54': '13.5rem',
				'58': '14.5rem',
				'62': '15.5rem',
				'66': '16.5rem',
				'70': '17.5rem',
				'74': '18.5rem',
				'78': '19.5rem',
				'82': '20.5rem',
				'86': '21.5rem',
				'90': '22.5rem',
				'94': '23.5rem',
				'98': '24.5rem',
			},
			colors: {
				// Bookings Assistant Design System Colors
				primary: {
					DEFAULT: '#10B981', // Primary green for CTAs and highlights
					foreground: '#FFFFFF'
				},
				secondary: {
					DEFAULT: '#34D399', // Lighter green tint
					foreground: '#FFFFFF'
				},
				background: {
					DEFAULT: '#1F2937', // Dark grey-blue
					secondary: '#111827' // Even darker for contrast
				},
				foreground: '#FFFFFF', // Primary text
				
				// Accent colors
				whatsapp: '#25D366',
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
					DEFAULT: '#34D399',
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
				lg: '0.5rem', // rounded-lg for buttons and components
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

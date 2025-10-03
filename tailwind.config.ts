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
				whatsapp: {
					DEFAULT: '#25D366',
					green: '#25D366',
					bg: '#f0f2f5',
					'bubble-user': '#10b981',
					'bubble-ai': '#ffffff',
					'chat-bg': '#ece5dd',
					'msg-bg': '#dcf8c6',
					header: '#25D366'
				},
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
				
				// Chart colors for data visualization
				chart: {
					blue: '#3b82f6',
					green: '#10b981',
					purple: '#a855f7',
					red: '#dc2626',
					orange: '#ea580c',
					yellow: '#ca8a04',
					emerald: '#10b981',
					slate: {
						DEFAULT: '#64748b',
						100: '#f1f5f9',
						200: '#e2e8f0',
						300: '#cbd5e1',
						400: '#94a3b8',
						500: '#64748b',
						600: '#475569',
						700: '#334155',
						800: '#1e293b',
						900: '#0f172a'
					}
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
				},
				'card-fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out',
				'card-fade-1': 'card-fade-in 0.8s ease-out',
				'card-fade-2': 'card-fade-in 0.8s ease-out 0.2s both',
				'card-fade-3': 'card-fade-in 0.8s ease-out 0.4s both'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

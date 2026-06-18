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
				sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
				serif: ['EB Garamond', 'Georgia', 'Times New Roman', 'serif'],
			},
			// DESIGN_SPEC §2 — the type scale as reusable tokens. Additive (nothing uses
			// these yet, so zero regression); primitives + rebuilt screens consume them so
			// sizes are never eyeballed. Inter is the workhorse; font-serif (EB Garamond)
			// carries the editorial voice on labels/empty-states only.
			fontSize: {
				'eyebrow': ['11px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600' }],
				'display': ['32px', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '600' }],
				'display-hero': ['44px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '600' }],
			},
			colors: {
				'surface-1': 'hsl(var(--surface-1))',
				'subtle-foreground': 'hsl(var(--subtle-foreground))',
				// Bookings Assistant Design System Colors
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				background: {
					DEFAULT: 'hsl(var(--background))',
					secondary: 'hsl(var(--surface-1))'
				},
				foreground: 'hsl(var(--foreground))',
				
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
				success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
				warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
				gold: { DEFAULT: 'hsl(var(--gold))', foreground: 'hsl(var(--gold-foreground))' },
				destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
				
				// Additional design system colors
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
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

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			inter: ['var(--font-inter)'],
  			playfair: ['"Playfair Display"', 'Georgia', 'serif'],
  			dmsans: ['"DM Sans"', 'system-ui', 'sans-serif']
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			insurance: {
  				50: '#f9f5ff',
  				100: '#f0e6ff',
  				200: '#e1ccff',
  				300: '#cd99ff',
  				400: '#b866ff',
  				500: '#a333ff',
  				600: '#9400FF',
  				700: '#7500cc',
  				800: '#5a0099',
  				900: '#3d0066',
  				950: '#1f0033',
  			},
  			purple: {
  				50: '#f5efff',
  				100: '#ece1ff',
  				200: '#dabcff',
  				300: '#be8aff',
  				400: '#9f4dff',
  				500: '#6F00FF',
  				600: '#5200c2',
  				700: '#3d0099',
  				800: '#290070',
  				900: '#140047',
  				950: '#0a0024',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
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
			shimmer: {
				'100%': { transform: 'translateX(100%)' },
			},
			'page-enter': {
				from: {
					opacity: '0',
					transform: 'translateY(12px)'
				},
				to: {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'card-enter': {
				from: {
					opacity: '0'
				},
				to: {
					opacity: '1'
				}
			},
			'list-item-enter': {
				from: {
					opacity: '0',
					transform: 'translateX(-8px)'
				},
				to: {
					opacity: '1',
					transform: 'translateX(0)'
				}
			},
			'marquee': {
				'0%': { transform: 'translateX(0%)' },
				'100%': { transform: 'translateX(-100%)' }
			},
			'marquee2': {
				'0%': { transform: 'translateX(100%)' },
				'100%': { transform: 'translateX(0%)' }
			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
			'shimmer': 'shimmer 2.5s infinite',
			'page-enter': 'page-enter 300ms ease-out',
			'card-enter': 'card-enter 300ms ease-out',
			'list-item-enter': 'list-item-enter 300ms ease-out',
			'marquee': 'marquee 30s linear infinite',
			'marquee2': 'marquee2 30s linear infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/container-queries")],
}

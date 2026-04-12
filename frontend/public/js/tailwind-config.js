tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mak: {
          red: '#ed1c24',
          dark: '#231F20',
          green: '#00a651',
          gold: '#d2ab67',
          gray: '#cdcccb',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'typing-bounce': 'typingBounce 1.4s infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'toast-in': 'toastIn 0.3s ease',
        'modal-in': 'modalIn 0.2s ease',
      },
      keyframes: {
        typingBounce: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-6px)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        modalIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    }
  }
}

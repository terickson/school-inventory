import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'schoolTheme',
    themes: {
      schoolTheme: {
        dark: false,
        colors: {
          primary: '#1565C0',
          'primary-lighten-1': '#64B5F6',
          'primary-darken-1': '#0D47A1',
          secondary: '#00796B',
          accent: '#F9A825',
          error: '#C62828',
          warning: '#E65100',
          success: '#2E7D32',
          info: '#0277BD',
          background: '#FAFAFA',
          surface: '#FFFFFF',
          'on-surface': '#212121',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      variant: 'elevated',
      rounded: 'lg',
    },
    VCard: {
      rounded: 'lg',
      elevation: 2,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },
    VDataTableServer: {
      hover: true,
      density: 'comfortable',
      mobileBreakpoint: 'sm',
    },
  },
})

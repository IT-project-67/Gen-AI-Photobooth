// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxt/eslint", 
    "@nuxt/image", 
    "@nuxt/test-utils", 
    "@nuxt/ui",
    "@nuxtjs/supabase"
  ],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm', 
      exclude: ['/']
    }
  },

  runtimeConfig: {
    supabase: {
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    public: {
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY,
      }
    }
  }
});
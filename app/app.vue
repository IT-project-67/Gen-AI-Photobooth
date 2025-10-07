<template>
  <NuxtLayout>
    <AppNavbar ref="navbarRef" />
    <NuxtPage />
    <NuxtRouteAnnouncer />
  </NuxtLayout>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
const { handleOAuthProfile } = useOAuth();
const providers = ["google", "discord"];
const lastProcessedUserId = ref<string | null>(null);

import { ref, onMounted, onUnmounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'

interface AppNavbarExpose {
  handleLogout: () => Promise<void>
}

const navbarRef = ref<AppNavbarExpose | null>(null)
const LOGOUT_DELAY = 1000 * 60 * 180 // 3 hours
let logoutTimer: number | null = null

function resetLogoutTimer(): void {
  if (logoutTimer !== null) {
    clearTimeout(logoutTimer)
  }

  logoutTimer = window.setTimeout(async () => {
    if (navbarRef.value?.handleLogout) {
      // console.log("auto logged out")
      await navbarRef.value.handleLogout()
    }
  }, LOGOUT_DELAY)
}

onMounted(() => {
  const events = ['click', 'mousemove', 'keydown', 'scroll']
  events.forEach(evt => window.addEventListener(evt, resetLogoutTimer))
  resetLogoutTimer()
})

onUnmounted(() => {
  const events = ['click', 'mousemove', 'keydown', 'scroll']
  events.forEach(evt => window.removeEventListener(evt, resetLogoutTimer))

  if (logoutTimer !== null) {
    clearTimeout(logoutTimer)
  }
})

watch(
  user,
  async (newUser, oldUser) => {
    if (newUser && !oldUser) {
      const provider = newUser.app_metadata?.provider;
      const isOAuthUser = provider && providers.includes(provider);
      const isOAuthLogin =
        isOAuthUser && newUser.id !== lastProcessedUserId.value;
      if (isOAuthLogin) {
        setTimeout(() => {
          handleOAuthProfile();
        }, 1000);
      }
    }
  },
  { immediate: false },
);
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  font-family: "Arial", sans-serif;
  background-color: #f5f5f5;
}

/* smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* responsive design for tablets */
@media (max-width: 786px) {
  html {
    font-size: 14px;
  }
}

/* responsive design for phones */
@media (max-width: 480px) {
  html {
    font-size: 12px;
  }
}
</style>

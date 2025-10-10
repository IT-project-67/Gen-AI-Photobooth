<template>
  <NuxtLayout>
    <AppNavbar ref="navbarRef" />
    <NuxtPage />
    <NuxtRouteAnnouncer />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import AppNavbar from "@/components/AppNavbar.vue";

const user = useSupabaseUser();
const { handleOAuthProfile } = useOAuth();
const providers = ["google", "discord"];
const lastProcessedUserId = ref<string | null>(null);
let isMonitoring = false;

interface AppNavbarExpose {
  handleLogout: () => Promise<void>;
}

const navbarRef = ref<AppNavbarExpose | null>(null);
const LOGOUT_DELAY = 1000 * 60 * 180;
// 10s logout delay for testing ↓
// const LOGOUT_DELAY = 1000 * 10
let logoutTimer: number | null = null;

function updateLastActiveTime(): void {
  localStorage.setItem("lastActive", Date.now().toString());
  // console.log("timer setted")
  resetLogoutTimer();
}

function checkExpired(): boolean {
  const lastActive = Number(localStorage.getItem("lastActive"));
  if (!lastActive) return false;

  const now = Date.now();
  const inactiveTime = now - lastActive;

  return inactiveTime > LOGOUT_DELAY;
}

async function initAutoLogout() {
  if (isMonitoring) return;
  isMonitoring = true;
  // check if expired
  if (checkExpired()) {
    // console.log("expired, please re log in")
    await navbarRef.value?.handleLogout();
    localStorage.removeItem("lastActive");
    return;
  }

  const events = ["click", "mousemove", "keydown", "scroll"];
  events.forEach((evt) => window.addEventListener(evt, updateLastActiveTime));
  updateLastActiveTime();
  // console.log("starting auto log out timer")
}

function resetLogoutTimer(): void {
  if (logoutTimer !== null) {
    clearTimeout(logoutTimer);
  }

  logoutTimer = window.setTimeout(async () => {
    if (navbarRef.value?.handleLogout) {
      // console.log("auto logged out")
      await navbarRef.value.handleLogout();
    }
  }, LOGOUT_DELAY);
}

onMounted(async () => {
  // check if logged in, if logged in, start auto logout timer.
  watchEffect(() => {
    if (user.value) {
      initAutoLogout();
    } else {
      const events = ["click", "mousemove", "keydown", "scroll"];
      events.forEach((evt) => window.removeEventListener(evt, updateLastActiveTime));
      isMonitoring = false;
      // console.log("no user, isMonitoring = false, eventlistener removed")
    }
  });
});

onUnmounted(() => {
  const events = ["click", "mousemove", "keydown", "scroll"];
  events.forEach((evt) => window.removeEventListener(evt, updateLastActiveTime));

  if (logoutTimer !== null) {
    clearTimeout(logoutTimer);
  }

  isMonitoring = false;
});

watch(
  user,
  async (newUser, oldUser) => {
    if (newUser && !oldUser) {
      const provider = newUser.app_metadata?.provider;
      const isOAuthUser = provider && providers.includes(provider);
      const isOAuthLogin = isOAuthUser && newUser.id !== lastProcessedUserId.value;
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

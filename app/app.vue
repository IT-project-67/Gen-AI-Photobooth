<template>
  <NuxtLayout>
    <NuxtPage />
    <NuxtRouteAnnouncer />
  </NuxtLayout>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
const { handleOAuthProfile } = useOAuth();

watch(
  user,
  async (newUser, oldUser) => {
    if (newUser && !oldUser) {
      const isOAuthUser = newUser.app_metadata?.provider !== "email";
      if (isOAuthUser) {
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

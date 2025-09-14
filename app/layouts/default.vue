<template>
  <div class="app-container">
    <AppNavbar />

    <slot />

    <AppFooter />
  </div>
</template>

<script lang="ts">
import AppFooter from "~/components/AppFooter.vue";
import AppNavbar from "~/components/AppNavbar.vue";

export default {
  name: "DefaultLayout",
  components: {
    AppNavbar,
    AppFooter,
  },
};
</script>

<style scoped>
.app-container {
  max-width: 768px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(to top left, white, #c27aad);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

/* responsive design for tablets and phones */
@media (max-width: 768px) {
  .app-container {
    max-width: 100%;
  }
}
</style>

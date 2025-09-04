<template>
    <div class="app-container">
        <AppNavbar />

        <slot />

        <AppFooter />
    </div>
</template>

<script lang="ts">
import AppFooter from '~/components/AppFooter.vue';
import AppNavbar from '~/components/AppNavbar.vue';

export default {
    name: 'DefaultLayout',
    components: {
        AppNavbar,
        AppFooter
    }
}
</script>

<style scoped>
.app-container {
    max-width: 500px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}
</style>
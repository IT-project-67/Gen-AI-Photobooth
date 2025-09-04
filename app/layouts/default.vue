<template>
    <div class="app-container">
        <Navbar />

        <slot />

        <Footer />
    </div>
</template>

<script lang="ts">
import Navbar from '~/components/Navbar.vue'
import Footer from '~/components/Footer.vue'

export default {
    name: 'DefaultLayout',
    components: {
        Navbar,
        Footer
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
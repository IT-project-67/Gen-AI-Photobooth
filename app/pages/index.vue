<template>
  <div class="home-page">
    <!-- HomePage scrolling preview pictures -->
    <HomePageCarousel :slides="slides" :autoplay="true" :interval="4000" />

    <!-- Announcer textbox (About Us) -->
    <AppTextbox :title="'About Us'" :paragraphs="introParagraphs" />

    <!-- Start Button -->
    <AppButton text="Start Now!" @click="clickStart" />

    <!-- Announcer textbox (Tutorial) -->
    <AppTextbox
      :title="'Quick Start Guide!'"
      :paragraphs="tutorialParagraphs"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

// // Nuxt3 里 layout 可以用 definePageMeta
// defineOptions({
//   name: "HomePage",
// })

// definePageMeta({
//   layout: "default",
// })

const router = useRouter();

// state
const slides = ref([
  { img: "/assets/images/banner1.jpg" },
  { img: "/assets/images/banner2.jpg" },
  { img: "/assets/images/banner3.jpg" },
]);

const introParagraphs = ref([
  "Welcome to (*App Name here*), where you can have fun with creating different styles AI generated pictures and share with your friends!",
  "↓↓↓ Try it out RIGHT NOW ↓↓↓",
]);

const tutorialParagraphs = ref([
  "1. Select your event logo or just skip if you don't have one!",
  "2. Take a selfie with your friends with the photobooth!",
  "3. Wait for the AI to generate several different style pictures!",
  "4. Pick one and share it with your friends!",
]);

// methods
const clickStart = () => {
  router.push("/login");
};
</script>

<style scoped>
.home-page {
  padding-bottom: 20px;
}

/* responsive design */
@media (max-width: 768px) {
  .home-page {
    padding-bottom: 15px;
  }
}

@media (max-width: 480px) {
  .home-page {
    padding-bottom: 10px;
  }
}
</style>

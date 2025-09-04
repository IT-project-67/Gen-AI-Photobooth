<template>
  <div class="home-page">
    <!-- HomePage scrolling preview pictures -->
    <HomePageCarousel :slides="slides" :autoplay="true" :interval="4000" />

    <!-- Announcer textbox (About Us) -->
    <AppTextbox :title="'About Us'" :paragraphs="introParagraphs" />

    <!-- Announcer textbox (Tutorial) -->
    <AppTextbox :title="'Quick Start Guide!'" :paragraphs="tutorialParagraphs" />
  </div>
</template>

<script lang="ts">
export default {
  name: "HomePage",
  layout: "default",
  data() {
    return {
      slides: [
        { img: "/assets/images/banner1.jpg" },
        { img: "/assets/images/banner2.jpg" },
        { img: "/assets/images/banner3.jpg" },
      ],
      introParagraphs: [
        "Welcome to (*App Name here*), where you can have fun with creating different styles AI generated pictures and share with your friends!",
        "↓↓↓ Try it out RIGHT NOW ↓↓↓"
      ],
      tutorialParagraphs: [
        "1. Select your event logo or just skip if you don't have one!",
        "2. Take a selfie with your friends with the photobooth!",
        "3. Wait for the AI to generate several different style pictures!",
        "4. Pick one and share it with your friends!"
      ]
    };
  },
  methods: {
    // methods
  },
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

<template>
  <div class="home-page">
    <!-- HomePage scrolling preview pictures -->
    <HomePageCarousel :slides="slides" :autoplay="true" :interval="4000" />
  </div>
</template>

<script lang="ts">
import HomePageCarousel from "~/components/HomePageCarousel.vue";

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

<template>
  <div class="select-photo-page">
    <div class="main-content">
      <h1 class="title">Swipe to Select</h1>

      <HomePageCarousel
        :slides="aiPhotos"
        :autoplay="false"
        class="ai-carousel"
      />

      <div class="button-class">
        <AppButton text="Retake" class="retake-button" @click="clickRetake" />

        <AppButton text="Share" class="share-button" @click="clickShare" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import HomePageCarousel from "~/components/HomePageCarousel.vue";

const route = useRoute();
const router = useRouter();
const eventId = route.query.eventId as string;
const sessionId = route.query.sessionId as string;

const aiPhotos = [
  { img: "/assets/images/selection.png" },
  { img: "/assets/images/selection.png" },
  { img: "/assets/images/selection.png" },
  { img: "/assets/images/selection.png" },
];

const clickShare = () => {
  navigateTo({
    path: "/sharePhoto",
    query: {
      eventId,
      sessionId,
    },
  });
};

const clickRetake = () => {
  router.push({
    name: "cameraPage",
    query: { eventId },
  });
};
</script>

<style>
.select-photo-page {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: -10px;
}

.title {
  color: black;
  margin-bottom: 20px;
  font-size: 2rem;
  margin-top: -10px;
}

.ai-carousel {
  width: 90%;
  max-width: 420px;
  height: auto !important;
  aspect-ratio: 2 / 3;
  margin: 20px auto;
  border-radius: 20px;
  overflow: hidden;
}

.ai-carousel img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.button-class {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  margin-left: 20px;
  margin-right: 20px;
}

.retake-button,
.next-button {
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  margin-right: 30px;
}
</style>

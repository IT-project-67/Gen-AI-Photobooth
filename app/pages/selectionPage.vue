<template>
  <div class="select-photo-page">
    <div class="main-content">
      <h1 class="title">Swipe to Select</h1>

      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading AI photos...</p>
      </div>

      <div v-else-if="error" class="error-container">
        <p>{{ error }}</p>
        <button class="retry-button" @click="loadAiPhotos">Retry</button>
      </div>

      <HomePageCarousel
        v-else
        ref="carouselRef"
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
import { useAiPhoto, type AIPhoto } from "~/composables/useAiPhoto";
const { getSessionAiPhotos, getAiPhotosBlobs, isLoading, error } = useAiPhoto();

// import { useShare } from "~/composables/useShare";
// const { createShare } = useShare();

import { ref, watchEffect, onMounted } from "vue";
const carouselRef = ref<any>(null);
const currentIndex = ref(0);

const route = useRoute();
const router = useRouter();
const eventId = route.query.eventId as string;
const sessionId = route.query.sessionId as string;

const aiPhotos = ref<{ img: string; id?: string; style?: string }[]>([
  { img: "/assets/images/selection.png" },
  { img: "/assets/images/selection.png" },
  { img: "/assets/images/selection.png" },
  { img: "/assets/images/selection.png" },
]);

const clickShare = async () => {
  const selectedPhoto = aiPhotos.value[currentIndex.value];

  if (!selectedPhoto) {
    console.log("No photo selected");
    return;
  }

  try {
    // const shareData = await createShare({
    //   eventId,
    //   aiphotoId: selectedPhoto.id,
    // });
    // if (!shareData) {
    //   throw new Error("Failed to create share data");
    // }
    // router.push({
    //   path: "/share",
    //   query: {
    //     shareId: shareData.shareId,
    //     qrCodeUrl: shareData.qrCodeUrl,
    //     expiresAt: shareData.expiresAt,
    //     shareUrl: shareData.shareUrl,
    //   },
    // });
  } catch (err) {
    console.error("Error during share: ", err);
  }
};

const loadAiPhotos = async () => {
  if (!sessionId) {
    console.error("Session ID is required");
    return;
  }

  try {
    const sessionData = await getSessionAiPhotos(sessionId);
    if (!sessionData || !sessionData.photos.length) {
      console.log("No AI photos found for session:", sessionId);
      return;
    }

    const blobUrls = await getAiPhotosBlobs(sessionData.photos);

    aiPhotos.value = sessionData.photos.map((photo: AIPhoto) => ({
      img: blobUrls[photo.id] || "/assets/images/selection.png",
      id: photo.id,
      style: photo.style,
    }));
  } catch (err) {
    console.error("Error loading AI photos:", err);
  }
};

onMounted(() => {
  watchEffect(() => {
    if (carouselRef.value?.currentSlide !== undefined) {
      currentIndex.value = carouselRef.value.currentSlide;
    }
  });

  loadAiPhotos();
});

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

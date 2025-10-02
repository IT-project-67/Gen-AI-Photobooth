<template>
  <div class="photo-preview">
    <div class="top-bar">
      <button class="retake" @click="onRetake">⟲ Retake the Photo</button>
      <GeneratingSign />
    </div>

    <div v-if="dataUrl" class="photo-container">
      <PhotoPreviewBox :photoUrl="dataUrl" />
      <!-- <img :src="photoBlobUrl" alt="photo" class="preview-image" /> -->
    </div>

    <AppButton text="Continue" class="continue-button" @click="clickContinue" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import GeneratingSign from "~/components/GeneratingSign.vue";
import PhotoPreviewBox from "~/components/PhotoPreviewBox.vue";
import { usePhoto } from "~/composables/usePhoto";

const route = useRoute();
const router = useRouter();
const { getPhotoFile } = usePhoto();

const photoBlobUrl = ref("");
const timestamp = ref("");

const eventId = route.query.eventId as string;
const dataUrl = route.query.dataUrl as string;

const clickContinue = () => {
  navigateTo("/selectPhoto");
};

const onRetake = () => {
  router.push({
    name: "cameraPage",
    query: { eventId },
  });
};

onMounted(async () => {
  const sessionId = route.query.sessionId as string;
  if (sessionId) {
    const blobUrl = await getPhotoFile(sessionId);
    if (blobUrl) {
      photoBlobUrl.value = blobUrl;
    } else {
      alert(
        "failed to store photo, please reatake one, return to photoTaking page",
      );
    }
  }
});
</script>

<style scoped>
.photo-container {
  margin: 0 auto;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
}

.top-bar {
  display: flex;
  justify-content: space-between; /* left: button, right: spinner */
  align-items: center;
  padding: 5px 15px;
  margin-bottom: 5px;
}

.retake {
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  border: 3px solid rgba(255, 255, 255, 0.8);
  padding: 6px 10px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
  color: white;
  margin-top: -15px;
}
</style>

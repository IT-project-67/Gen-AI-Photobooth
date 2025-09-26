<template>
  <div class="camera-page">
    <div class="camera-section">
      <AppCamera
        :width="cameraWidth"
        :height="cameraHeight"
        @photo-captured="onPhotoCaptured"
        @error="onError"
      />
    </div>

    <div v-if="errorMessage" class="error-message">
      <p>{{ errorMessage }}</p>
      <button @click="clearError">close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import AppCamera from "~/components/AppCamera.vue";

const router = useRouter();
const route = useRoute();

interface CapturedPhoto {
  dataUrl: string;
  timestamp: string;
}

const errorMessage = ref("");
const currentPhoto = ref<CapturedPhoto | null>(null);
const cameraWidth = ref(0);
const cameraHeight = ref(0);

const onPhotoCaptured = (dataUrl: string) => {
  const photo: CapturedPhoto = {
    dataUrl,
    timestamp: new Date().toLocaleString("en-GB"),
  };
  currentPhoto.value = photo;

  //   switch to preview page (need to change to await method in further development)
  setTimeout(() => {
    router.push({
      name: "PhotoPreview",
      query: {
        dataUrl: photo.dataUrl,
        timestamp: photo.timestamp,
      },
    });
  }, 1000);
};

const onError = (error: string) => {
  errorMessage.value = error;
};

const clearError = () => {
  errorMessage.value = "";
};

onMounted(async () => {
  const eventId = route.query.eventId as string;
  if (!eventId) {
    await navigateTo("/selectEvent");
    return;
  }

  const maxWidth = Math.min(window.innerWidth * 0.95, 400);
  cameraWidth.value = maxWidth;
  cameraHeight.value = (maxWidth / 3) * 4;
});
</script>

<style scoped>
.camera-page {
  display: flex;
  flex-direction: column;
}

.camera-section {
  padding: 1rem;
}

.error-message {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: white;
  text-align: center;
  max-width: 400px;
}

.error-message button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.error-message button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.photo-preview {
  margin: 10px 5%;
}

.photo-preview img {
  max-width: 100%;
}

@media (max-width: 768px) {
  .camera-section {
    margin: 0 0.5rem;
  }
}
</style>

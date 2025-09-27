<template>
  <div class="photo-preview">
    <div v-if="photoBlobUrl" class="photo-container">
      <p>Preview Page, will change in further development</p>
      <img :src="photoBlobUrl" alt="photo" class="preview-image" />
      <div class="photo-info">
        <p class="photo-time">TakenTime: {{ timestamp }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePhoto } from "~/composables/usePhoto";

const route = useRoute();
const { getPhotoFile } = usePhoto();

const photoBlobUrl = ref("");
const timestamp = ref("");

onMounted(async () => {
  const sessionId = route.query.sessionId as string;
  if (sessionId) {
    const blobUrl = await getPhotoFile(sessionId);
    if (blobUrl) {
      photoBlobUrl.value = blobUrl;
    }
  }
});
</script>

<style scoped>
.photo-container {
  margin: 0 auto;
  max-width: 95vw;
  max-height: 95vh;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
}
</style>

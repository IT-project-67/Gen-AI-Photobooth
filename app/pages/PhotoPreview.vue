<template>
  <div class="photo-preview">
    <div class="photo-container" v-if="photo">
      <p>Preview Page, will change in further development</p>
      <img :src="photo.dataUrl" alt="photo" class="preview-image" />
      <div class="photo-info">
        <p class="photo-time">TakenTime: {{ photo.timestamp }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

interface Photo {
  dataUrl: string;
  timestamp: number;
}

const router = useRouter();
const photo = ref<Photo | null>(null);

onMounted(() => {
  const photoData = history.state?.photo;
  if (photoData) {
    photo.value = photoData;
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

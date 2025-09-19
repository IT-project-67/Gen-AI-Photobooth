<template>
  <div class="photo-preview">
    <div v-if="dataUrl" class="photo-container">
      <p>Preview Page, will change in further development</p>
      <img :src="dataUrl" alt="photo" class="preview-image" />
      <div class="photo-info">
        <p class="photo-time">TakenTime: {{ timestamp }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const dataUrl = route.query.dataUrl as string;
const timestamp = route.query.timestamp as string;
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

<template>
  <div class="previewWrapper">
    <img class="photo" :src="props.photoUrl" alt="Preview Photo" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  photoUrl: string;
}>();
</script>

<style scoped>
.previewWrapper {
  width: 90%;
  aspect-ratio: 2/3;
  margin: 0 auto;
  background-color: white;
  border-radius: 7px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.photo {
  max-width: 93%;
  height: auto;
  display: block;
  margin: 0 auto;
  border: 3px solid white;
  border-radius: 15px;
}
</style>

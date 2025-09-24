<template>
  <div class="previewWrapper">
    <div class="previewContainer">
      <img class="logo" :src="props.logoUrl" alt="Preview Logo" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  logoUrl: string;
}>();
</script>

<style scoped>
.previewWrapper {
  width: 85%;
  aspect-ratio: 3/4;
  margin: 0 auto;
  background-color: white;
  border-radius: 7px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.previewContainer {
  position: relative;
  margin: 6%;
  width: 88%;
  aspect-ratio: 3/4;
  display: inline-block;

  /* grey and white preview background */
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
  border: 3px solid #cccccc;
  border-radius: 5px;
  overflow: hidden;
}

.logo {
  position: absolute;
  bottom: 10px;
  right: 10px;
  max-width: 15%;
  max-height: 15%;
}
</style>

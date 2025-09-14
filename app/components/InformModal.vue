<template>
  <div class="modalComponent">
    <div class="modal-content">
      <slot />
      <button class="modal-close" @click="close">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// close emit
const emit = defineEmits<{
  (e: "close"): void;
}>();

// close method
const close = () => {
  emit("close");
};
</script>

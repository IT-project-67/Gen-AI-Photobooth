<template>
  <img
    :src="src"
    :alt="alt"
    :loading="loading"
    :fetchpriority="fetchpriority"
    :class="className"
    @load="onLoad"
    @error="onError"
  />
</template>

<script setup lang="ts">
interface Props {
  src: string;
  alt: string;
  loading?: "eager" | "lazy";
  fetchpriority?: "high" | "low" | "auto";
  className?: string;
}
// eslint-disable-next-line
const props = withDefaults(defineProps<Props>(), {
  loading: "lazy",
  fetchpriority: "auto",
  className: "",
});
const emit = defineEmits<{
  load: [event: Event];
  error: [event: Event];
}>();
const onLoad = (event: Event) => {
  emit("load", event);
};
const onError = (event: Event) => {
  emit("error", event);
};
</script>

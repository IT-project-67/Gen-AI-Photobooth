<template>
  <!-- when the QR code is being generated -->
  <div class="page">
    <div v-if="qrSrc === null && error === null" class="center-full">
      <GeneratingSign></GeneratingSign>
    </div>
    <div v-else class="wrapper">
      <!-- error state -->
      <div v-if="error" class="error-box">
        <p>{{ error }}</p>
        <button class="retry-button" @click="loadQr">Retry</button>
      </div>

      <div v-else-if="qrSrc">
        <!-- heading -->
        <h1>Scan the QR Code for Your Photo!</h1>
        <img :src="qrSrc" />
        <button class="retry-button" @click="navigateTo(`/cameraPage?eventId=${eventId}`)">
          Back to Camera
        </button>
      </div>

      <!-- QR code image -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useShare } from "~/composables/useShare";

const { getQRCodeBlob } = useShare();
const route = useRoute();
const qrSrc = ref<string | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const eventId = ref("");

async function loadQr() {
  //   qrSrc.value =
  //     "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=Hello%20World";
  loading.value = true;
  error.value = null;
  try {
    const shareId = route.query.shareId as string;
    eventId.value = route.query.eventId as string;
    if (!shareId) {
      throw new Error("Share ID is missing");
    }
    if (!eventId) {
      throw new Error("Event ID is missing");
    }
    qrSrc.value = await getQRCodeBlob(shareId);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : "Failed to load QR";
  } finally {
    loading.value = false;
  }
}
onMounted(loadQr);
</script>

<style>
.wrapper {
  width: 85%;
  margin: 0 auto;
  padding: 30px;
  background: white;
  border-radius: 7px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  margin-bottom: 15px;
}

.center-full {
  min-height: 70dvh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.retry-button:hover {
  background: linear-gradient(to right, #9b30ff, #ff85c1); /* brighter colors */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* subtle shadow */
}

.retry-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  color: white;
  margin-top: 15px;
  width: 100%;
}

h1 {
  margin-bottom: 15px;
}
</style>

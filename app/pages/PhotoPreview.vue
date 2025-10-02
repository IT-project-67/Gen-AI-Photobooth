<template>
  <div class="photo-preview">
    <div class="top-bar">
      <button class="retake" @click="onRetake">⟲ Retake the Photo</button>
      <!-- <GeneratingSign
        v-if="status.isGenerating || aiPhotos.length != 4 || !photoBlobUrl"
      /> -->
    </div>

    <div v-if="dataUrl" class="photo-container">
      <PhotoPreviewBox :photo-url="dataUrl" />
      <!-- <img :src="photoBlobUrl" alt="photo" class="preview-image" /> -->
    </div>

    <!-- <AppButton
      v-if="!status.isGenerating && aiPhotos.length == 4 && photoBlobUrl"
      text="Continue"
      class="continue-button"
      @click="clickContinue"
    /> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import GeneratingSign from "~/components/GeneratingSign.vue";
import PhotoPreviewBox from "~/components/PhotoPreviewBox.vue";
import AppButton from "~/components/AppButton.vue";
import { usePhoto } from "~/composables/usePhoto";
// import { useAiPhoto } from "~/composables/useAiPhoto";
// import { useLeonardo } from "~/composables/useLeonardo";

const route = useRoute();
const router = useRouter();
const { getPhotoFile } = usePhoto();
// const { getSessionAiPhotos } = useAiPhoto();
// const { status, generateImages } = useLeonardo();

const photoBlobUrl = ref("");

const eventId = route.query.eventId as string;
const dataUrl = route.query.dataUrl as string;
const sessionId = route.query.sessionId as string;
const aiPhotos = ref<any[]>([]);

const clickContinue = () => {
  navigateTo({
    path: "/selectPhoto",
    query: {
      eventId,
      sessionId,
    },
  });
};

const onRetake = () => {
  router.push({
    name: "cameraPage",
    query: { eventId },
  });
};

// onMounted(async () => {
//   const sessionId = route.query.sessionId as string;
//   if (sessionId) {
//     const blobUrl = await getPhotoFile(sessionId);
//     if (blobUrl) {
//       photoBlobUrl.value = blobUrl;
//     } else {
//       alert("Failed to store photo. Redirecting to retake...");

//       setTimeout(() => {
//         router.push({
//           name: "cameraPage",
//           query: { eventId },
//         });
//       }, 1500);
//     }
//   }

//   if (dataUrl) {
//     const res = await fetch(dataUrl);
//     const blob = await res.blob();
//     const file = new File([blob], "input-photo.jpg", { type: blob.type });

//     const { data, error } = await generateImages({
//       image: file,
//       eventId,
//       sessionId,
//     });

//     if (!error && data) {
//       const checkPhotos = async () => {
//         const result = await getSessionAiPhotos(sessionId);
//         if (result && result.photos && result.photos.length == 4) {
//           aiPhotos.value = result.photos;
//           return true;
//         }
//         return false;
//       };

//       const interval = setInterval(async () => {
//         const ready = await checkPhotos();
//         if (ready) {
//           clearInterval(interval);
//         }
//       }, 2000);
//     }
//   }
// });
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

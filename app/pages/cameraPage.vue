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
const { createSession, uploadPhoto, dataUrlToFile, error } = usePhoto();

interface CapturedPhoto {
  dataUrl: string;
  timestamp: string;
  sessionId?: string;
}

const errorMessage = ref("");
const currentPhoto = ref<CapturedPhoto | null>(null);
const cameraWidth = ref(0);
const cameraHeight = ref(0);
const eventId = ref("");


const onPhotoCaptured = async (dataUrl: string) => {
  try {
    errorMessage.value = "";
    
    const photo: CapturedPhoto = {
      dataUrl,
      timestamp: new Date().toLocaleString("en-GB"),
    };
    currentPhoto.value = photo;

    console.log('Creating session for event:', eventId.value);
    const session = await createSession(eventId.value);
    
    if (!session) {
      const errorMsg = error.value || 'Failed to create session';
      console.error('Session creation failed:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('Session created successfully:', session);

    photo.sessionId = session.id;
    currentPhoto.value = photo;

    const file = dataUrlToFile(dataUrl, `photo_${Date.now()}.jpg`);
    
    console.log('Uploading photo for session:', session.id);
    const uploadResult = await uploadPhoto(eventId.value, session.id, file);
    
    if (!uploadResult) {
      const errorMsg = error.value || 'Failed to upload photo';
      console.error('Photo upload failed:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('Photo uploaded successfully:', uploadResult);

    setTimeout(() => {
      router.push({
        name: "PhotoPreview",
        query: {
          sessionId: session.id,
          eventId: eventId.value,
        },
      });
    }, 1000);

  } catch (err: unknown) {
    console.error('Error in photo capture process:', err);
    if (err instanceof Error) {
      errorMessage.value = err.message;
    } else {
      errorMessage.value = 'Failed to process photo';
    }
  }
};

const onError = (error: string) => {
  errorMessage.value = error;
};

const clearError = () => {
  errorMessage.value = "";
};

onMounted(async () => {
  const eventIdParam = route.query.eventId as string;
  if (!eventIdParam) {
    await navigateTo("/selectEvent");
    return;
  }
  eventId.value = eventIdParam;

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

<template>
  <div class="camera-wrapper">
    <div class="camera-preview">
      <video
        ref="videoRef"
        :class="{ mirrored: currentFacingMode === 'user' }"
        autoplay
        playsinline
        muted
      ></video>

      <button
        class="flip-button"
        :disabled="!canFlip"
        title="flipCamera"
        @click="flipCamera"
      >
        <p class="flip-content">🔄</p>
      </button>
    </div>

    <div class="camera-control">
      <button
        class="camera-button"
        :disabled="!isReady"
        title="takePhoto"
        @click="takePhoto"
      >
        <div class="button-inner"></div>
      </button>
    </div>

    <canvas ref="canvasRef" style="display: none"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";

interface props {
  width?: number;
  height?: number;
}

const props = withDefaults(defineProps<props>(), {
  width: 300,
  height: 400,
});

interface Emits {
  (e: "photo-captured", dataUrl: string): void;
  (e: "error", error: string): void;
}

const emit = defineEmits<Emits>();

const videoRef = ref<HTMLVideoElement>();
const canvasRef = ref<HTMLCanvasElement>();
const stream = ref<MediaStream | null>(null);
const currentFacingMode = ref<"user" | "environment">("environment");
const canFlip = ref(false);
const isReady = ref(false);

const initCamera = async (
  facingMode: "user" | "environment" = "environment",
) => {
  try {
    // stop previous stream if exists
    if (stream.value) {
      stream.value.getTracks().forEach((track) => track.stop());
    }

    // request camera access
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: props.width },
        height: { ideal: props.height },
      },
      audio: false,
    };

    stream.value = await navigator.mediaDevices.getUserMedia(constraints);

    if (videoRef.value) {
      videoRef.value.srcObject = stream.value;
      await nextTick();

      await new Promise<void>((resolve) => {
        if (videoRef.value) {
          videoRef.value.onloadedmetadata = () => {
            resolve();
          };
        }
      });

      isReady.value = true;
      currentFacingMode.value = facingMode;

      checkCameraFlip();
    }
  } catch (error) {
    console.error("Failed to init camera:", error);
    emit("error", "Unable to access camera, please check your settings");
    isReady.value = false;
  }
};

const checkCameraFlip = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput",
    );
    canFlip.value = videoDevices.length > 1;
  } catch (error) {
    console.error("Failed to check camera:", error);
    canFlip.value = false;
  }
};

const flipCamera = async () => {
  if (!canFlip.value) return;

  const newFacingMode =
    currentFacingMode.value === "user" ? "environment" : "user";
  await initCamera(newFacingMode);
};

const takePhoto = () => {
  if (!videoRef.value || !canvasRef.value || !isReady.value) {
    emit("error", "Camera not ready");
    return;
  }

  const video = videoRef.value;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    emit("error", "unable to caputure");
    return;
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  const targetRatio = 3 / 4;
  const videoRatio = videoWidth / videoHeight;

  let cropWidth, cropHeight, cropX, cropY;

  if (videoRatio > targetRatio) {
    // crop left and right
    cropHeight = videoHeight;
    cropWidth = videoHeight * targetRatio;
    cropX = (videoWidth - cropWidth) / 2;
    cropY = 0;
  } else {
    // crop top and bottom
    cropWidth = videoWidth;
    cropHeight = videoWidth / targetRatio;
    cropX = 0;
    cropY = (videoHeight - cropHeight) / 2;
  }

  // set canvas to 4:3
  const outputWidth = 960; // constant width
  const outputHeight = 1280; // constant 4:3 height

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  if (currentFacingMode.value === "user") {
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      -outputWidth,
      0,
      outputWidth,
      outputHeight,
    );
  } else {
    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  emit("photo-captured", dataUrl);
};

onMounted(() => {
  initCamera();
});

onUnmounted(() => {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
  }
});
</script>

<style scoped>
.camera-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-height: 75vh;
}

.camera-preview {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: #1a1a1a;
  aspect-ratio: 3/4;
}

video {
  display: block;
  width: 100%;
  object-fit: cover;
  border-radius: 10px;
  aspect-ratio: 3/4;
}

.mirrored {
  transform: scaleX(-1);
}

.flip-button {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #333;
  font-size: 20px;
}

.flip-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.flip-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flip-content {
  margin-top: -2.5px;
}

.camera-control {
  display: flex;
  justify-content: center;
  align-items: center;
}

.camera-button {
  width: 70px;
  height: 70px;
  background: #fff;
  border: 4px solid rgba(226, 90, 192, 1);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
}

.camera-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.camera-button:active:not(:disabled) {
  transform: scale(0.95);
}

.camera-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-inner {
  width: 50px;
  height: 50px;
  background: rgb(196, 79, 171);
  border-radius: 50%;
  transition: all 0.1s ease;
}

.camera-button:active:not(:disabled) .capture-inner {
  transform: scale(0.8);
}

@media (max-width: 480px) {
  .camera-wrapper {
    padding: 10px;
    gap: 15px;
    max-width: 100%;
  }

  video {
    aspect-ratio: 3/4;
  }

  .flip-button {
    width: 40px;
    height: 40px;
    top: 10px;
    right: 10px;
  }

  .camera-button {
    width: 60px;
    height: 60px;
  }

  .button-inner {
    width: 40px;
    height: 40px;
  }
}
</style>

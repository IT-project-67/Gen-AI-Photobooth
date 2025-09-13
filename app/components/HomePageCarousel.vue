<template>
  <div class="carousel">
    <div
      class="carousel-track"
      :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
    >
      <div v-for="(slide, index) in slides" :key="index" class="carousel-slide">
        <div class="carousel-content">
          <img
            v-if="slide.img"
            :src="slide.img"
            alt="Banner Image"
            class="carousel-image"
          />
          <div v-else>{{ slide.content || "" }}</div>
        </div>
      </div>
    </div>
    <div class="carousel-indicators">
      <span
        v-for="(slide, index) in slides"
        :key="index"
        :class="{ active: currentSlide === index }"
        @click="goToSlide(index)"
      />
    </div>
    <div class="carousel-button">
      <button @click="prevSlide">◀</button>
      <button @click="nextSlide">▶</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, withDefaults } from "vue";

type Slide = { img?: string; content?: string };

const props = withDefaults(
  defineProps<{
    slides?: Slide[];
    autoplay?: boolean;
    interval?: number;
  }>(),
  {
    slides: () => [{ img: "img1" }, { img: "img2" }, { img: "img3" }],
    autoplay: true,
    interval: 5000,
  },
);

// state
const currentSlide = ref(0);
const intervalId = ref<ReturnType<typeof setInterval> | null>(null);

// methods
const nextSlide = () => {
  if (!props.slides.length) return;
  currentSlide.value = (currentSlide.value + 1) % props.slides.length;
};

const prevSlide = () => {
  if (!props.slides.length) return;
  currentSlide.value =
    (currentSlide.value - 1 + props.slides.length) % props.slides.length;
};

const goToSlide = (index: number) => {
  currentSlide.value = index;
};

const startAutoPlay = () => {
  if (!props.autoplay || !props.slides.length) return;
  stopAutoPlay();
  intervalId.value = setInterval(nextSlide, props.interval);
};

const stopAutoPlay = () => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
};

// lifecycle
onMounted(() => {
  startAutoPlay();
});

onBeforeUnmount(() => {
  stopAutoPlay();
});
</script>

<style scoped>
.carousel {
  background-color: rgba(230, 185, 233, 0.7);
  width: calc(100% - 50px);
  height: 35vh;
  position: relative;
  overflow: hidden;
  margin: -5px 20px 20px;
  border-radius: 50px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
}

.carousel-slide {
  min-width: 100%;
  height: 100%;
}

.carousel-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 5px solid rgba(230, 185, 233, 0.7);
  border-radius: 50px;
  background-color: white;
  font-size: 1.2rem;
  font-weight: bold;
  color: #c44acb;
  overflow: hidden;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.carousel-button {
  position: absolute;
  top: 50%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
  transform: translateY(-50%);
}

.carousel-button button {
  background: none;
  border: none;
  font-size: 45px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  z-index: 10;
  /* optional white circle around the arrow, but cannnot perfectly align with the arrow */
  /* background-color: rgba(255, 255, 255, 0.5);
    width: 30px;
    height: 30px;
    border: 2px solid #c44acb;
    border-radius: 50%; */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.carousel-button button:hover {
  color: rgba(255, 255, 255, 0.9);
  transform: scale(1.1);
}

.carousel-button button:active {
  transform: scale(0.9);
}

.carousel-indicators {
  position: absolute;
  bottom: 10px;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.carousel-indicators span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
}

.carousel-indicators span:hover {
  background-color: rgba(255, 255, 255, 0.9);
  transform: scale(1.2);
}

.carousel-indicators span.active {
  background-color: rgba(226, 90, 192, 1);
  transform: scale(1.5);
}

/* responsive design */
@media (max-width: 768px) {
  .carousel {
    height: 30vh;
    width: calc(100% - 30px);
    margin: -5px 15px 15px;
  }

  .carousel-button button {
    font-size: 30px;
  }
}

@media (max-width: 480px) {
  .carousel {
    height: 25vh;
    width: calc(100% - 20px);
    margin: -5px 10px 10px;
  }

  .carousel-button button {
    font-size: 25px;
  }
}
</style>

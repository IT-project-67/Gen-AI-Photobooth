<template>
  <div class="button-component">
    <button class="button" @click="$emit('click')">
      {{ text }}
    </button>
  </div>
</template>

<script lang="ts">
export default {
  name: "AppButton",
  props: {
    text: {
      type: String,
      default: "A Button",
    },
  },
};
</script>

<style scoped>
.button-component {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.button {
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  border: 5px solid rgba(255, 255, 255, 0.8);
  padding: 20px 40px;
  font-size: 2rem;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  color: white;
  border-radius: 75px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.button:hover {
  background: linear-gradient(to right, #9932cc, #ff1493);
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.button:active {
  transform: scale(0.95);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* responsive design */
@media (max-width: 786px) {
  .button {
    padding: 15px 30px;
    border-radius: 50px;
  }
}

@media (max-width: 480px) {
  .button {
    padding: 10px 20px;
    border-radius: 50px;
  }
}
</style>

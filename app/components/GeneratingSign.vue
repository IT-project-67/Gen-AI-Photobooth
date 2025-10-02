<template>
  <div v-if="visible" class="generatingSign">
    <div class="spinner">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
    <span class="text">Generating...</span>
  </div>
</template>

<script setup lang="ts">
const visible = ref(true);
</script>

<style>
.generatingSign {
  /* position: absolute;
  top: 100px;
  right: 20px; */
  display: flex;
  flex-direction: column;
  align-items: center;
  /* z-index: 9999; */
}

.spinner {
  position: relative;
  width: 10px;
  height: 10px;
  margin-right: 45px;
}

.spinner div {
  transform-origin: 10px 10px;
  animation: starSpin 1.2s linear infinite;
  position: absolute;
  width: 5px;
  height: 14px;
  background: #333;
  top: 2px;
  left: 17px;
  border-radius: 3px;
}
.spinner div:nth-child(1) {
  transform: rotate(0deg) translate(0, -12px);
  animation-delay: -1.1s;
}
.spinner div:nth-child(2) {
  transform: rotate(45deg) translate(0, -12px);
  animation-delay: -1s;
}
.spinner div:nth-child(3) {
  transform: rotate(90deg) translate(0, -12px);
  animation-delay: -0.9s;
}
.spinner div:nth-child(4) {
  transform: rotate(135deg) translate(0, -12px);
  animation-delay: -0.8s;
}
.spinner div:nth-child(5) {
  transform: rotate(180deg) translate(0, -12px);
  animation-delay: -0.7s;
}
.spinner div:nth-child(6) {
  transform: rotate(225deg) translate(0, -12px);
  animation-delay: -0.6s;
}
.spinner div:nth-child(7) {
  transform: rotate(270deg) translate(0, -12px);
  animation-delay: -0.5s;
}
.spinner div:nth-child(8) {
  transform: rotate(315deg) translate(0, -12px);
  animation-delay: -0.4s;
}

/* fade animation */
@keyframes starSpin {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 0.1;
  }
}

.text {
  margin-top: 28px;
  font-size: 14px;
  color: black;
}
</style>

<template>
  <div class="textbox">
    <h2 class="text-title">{{ title }}</h2>
    <div class="text-content">
      <p
        v-for="(paragraph, index) in paragraphs"
        :key="index"
        class="text-paragraph"
      >
        {{ paragraph }}
      </p>
      <p v-if="paragraphs.length === 0" class="text-paragraph">
        Oops, Looks like there's nothing here :(
      </p>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: "AppTextbox",
  props: {
    title: {
      type: String,
      default: "Default Title",
    },
    paragraphs: {
      type: Array,
      default: () => [],
    },
  },
};
</script>

<style scoped>
.textbox {
  padding: 20px;
  margin: 0 20px 20px;
  opacity: 0.65;
  background: linear-gradient(to bottom right, #65789b, #73628d);
  color: white;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.text-title {
  margin-bottom: 15px;
  text-decoration: underline;
  font-size: 3rem;
  font-weight: bold;
  color: white;
  text-align: center;
}

.text-content {
  margin-top: 20px;
  text-align: center;
}

.text-paragraph {
  margin-bottom: 10px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.5rem;
}

/* responsive design */
@media (max-width: 768px) {
  .textbox {
    padding: 15px;
    margin: 0 15px 15px;
  }

  .text-title {
    font-size: 2.5rem;
  }
}

@media (max-width: 480px) {
  .textbox {
    padding: 10px;
    margin: 0 10px 10px;
  }

  .text-title {
    font-size: 2rem;
  }

  .text-paragraph {
    font-size: 1.1rem;
  }
}
</style>

<template>
  <div class="input-box">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      v-model="inputValue"
      :type="type"
      :placeholder="placeholder"
      :required="required"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "AppInputBox",

  props: {
    label: { type: String, default: "Label" },
    placeholder: { type: String, default: "" },
    modelValue: { type: String, default: "" },
    type: { type: String, default: "text" },
    id: { type: String, default: "input" },
    required: { type: Boolean, default: false },
  },

  computed: {
    inputValue: {
      get() {
        return this.modelValue;
      },

      set(value: string) {
        this.$emit("update:modelValue", value);
      },
    },
  },
});
</script>

<style scoped>
.AppInputBox {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 15px;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  text-align: left;
}

input {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* input:focus { 
    outline: none; 
    border-color: #8a2be2; 
    box-shadow: 0 0 0 2px rgba(138, 43, 226, 0.2); 
} */

/* Responsive styles */
@media (min-width: 480px) {
  input {
    font-size: rem;
  }
}

@media (min-width: 768px) {
  input {
    font-size: 0.98rem;
  }
}
</style>

<template>
  <div class="AppInputBox">
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

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    modelValue?: string;
    type?: string;
    id?: string;
    required?: boolean;
  }>(),
  {
    label: "Label",
    placeholder: "",
    modelValue: "",
    type: "text",
    id: "input",
    required: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
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

<template>
  <div class="page">
    <div v-if="submittedEventID === ''" class="wrapper">
      <!-- title -->
      <h1 class="title">Return to Your Event!</h1>

      <!-- discription of drop down box -->
      <label class="select-label" for="event-select">Select an event: </label>

      <!-- drop down box -->
      <select v-model="selectedEventID" class="event-select">
        <!-- placeholder -->
        <option disabled value="">-- Please choose an event --</option>

        <!-- options -->
        <option v-for="event in events" :key="event.id" :value="event.id">
          {{ event.name }} ({{ new Date(event.date).toLocaleDateString() }})
        </option>
      </select>

      <!-- button -->
      <button
        class="submit-button"
        :disabled="isSubmitting || selectedEventID === ''"
        @click="handleSubmit"
      >
        {{ isSubmitting ? "Processing..." : "Submit" }}
      </button>
    </div>

    <div v-if="submittedEventID !== ''" class="wrapper">
      <!-- title -->
      <h1>Welcome back to AI Photobooth Launch Party!</h1>
      <br />
      <p class="event-info">
        Created {{ 2020 - 12 - 30 }}
        <span class="dot">•</span>
        Ends {{ 2020 - 12 - 31 }}
      </p>
      <p>Please confirm the event logo below before continuing.</p>
    </div>
    <!-- preview box -->
    <PreviewBox v-if="submittedEventID !== ''" logo-url="" />

    <!-- continue button -->
    <AppButton
      v-if="submittedEventID !== ''"
      text="continue"
      class="continue-button"
    />
    <AppButton
      v-if="submittedEventID !== ''"
      text="reselect event"
      class="continue-button"
      @click="
        submittedEventID = '';
        isSubmitting = false;
        selectedEventID = '';
      "
    />
  </div>
</template>

<script setup lang="ts">
import AppButton from "~/components/AppButton.vue";

const selectedEventID = ref("");
const submittedEventID = ref("");
const isSubmitting = ref(false);
// const events = ref<[]>([])
const events = [
  { id: "1", name: "AI Photobooth Launch Party", date: "2025-09-01" },
  { id: "2", name: "Wedding Celebration – Emily & John", date: "2025-09-10" },
  { id: "3", name: "Melbourne Tech Conference", date: "2025-09-15" },
  { id: "4", name: "University Open Day", date: "2025-09-20" },
  { id: "5", name: "Startup Pitch Night", date: "2025-09-25" },
  { id: "6", name: "Halloween Party", date: "2025-10-31" },
  { id: "7", name: "Charity Gala Dinner", date: "2025-11-12" },
  { id: "8", name: "Christmas Festival", date: "2025-12-24" },
];

// const fetchEventLogo //get the event logo with ID
// const fetchEventList //request a list of eventID by the user
const handleSubmit = (): void => {
  // enable loading when submitted and waiting for response
  isSubmitting.value = true;
  submittedEventID.value = selectedEventID.value;
};
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

.previewWrapper {
  width: 85%;
  aspect-ratio: 3/4;
  margin: 0 auto;
  background-color: white;
  border-radius: 7px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.title {
  margin-bottom: 10px;
  font-size: 2rem;
}

.select-label {
  font-size: 1.2rem;
}

.event-select {
  width: 100%;
  margin-top: 10px;
  font-size: 1rem;
}

.event-select option {
  padding: 8px;
  font-size: 1rem;
}

select {
  width: 100%;
  max-width: 300px;
  white-space: nowrap; /* keep text in one line */
  overflow: hidden; /* hide overflow */
  text-overflow: ellipsis; /* add ... at the end */
}

select:hover {
  border-color: #9b30ff; /* brighter border on hover */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* subtle shadow */
}

.submit-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  color: white;
  margin-top: 15px;
  width: 100%;
}

/* Hover only when active */
.submit-button:hover:not(:disabled) {
  background: linear-gradient(to right, #9b30ff, #ff85c1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Disabled state → same gradient, just dimmed */
.submit-button:disabled {
  opacity: 0.5; /* makes the button look faded */
  cursor: not-allowed;
  box-shadow: none; /* no hover shadow */
}

.continue-button {
  margin-top: 15px; /* adjust as needed */
}

/* small, subtle line under the title */
.event-meta {
  margin-top: 6px;
  font-size: 0.875rem; /* 14px */
  line-height: 1.4;
  color: #6b7280; /* neutral gray */
}

/* tiny separator dot spacing */
.event-meta .dot {
  margin: 0 6px;
  color: #9ca3af;
}
</style>

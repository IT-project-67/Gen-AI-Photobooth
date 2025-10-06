<template>
  <div class="page">
    <div class="createEvent">
      <div class="createEventForm">
        <h1>Create your event</h1>

        <form @submit.prevent="handleSubmit">
          <AppInputBox
            id="eventName"
            v-model="eventName"
            label="Event Name"
            placeholder="Enter your event name"
            type="eventName"
            :required="true"
          />
          <p v-if="nameError" class="error">{{ nameError }}</p>

          <AppInputBox
            id="eventStartDate"
            v-model="eventStartDate"
            label="Event Start Date"
            placeholder="Enter your event start date"
            type="date"
            :required="true"
          />

          <p v-if="startError" class="error">{{ startError }}</p>

          <AppInputBox
            id="eventEndDate"
            v-model="eventEndDate"
            label="Event End Date"
            placeholder="Enter your event end date"
            type="date"
            :required="true"
          />

          <p v-if="endError" class="error">{{ endError }}</p>
        </form>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/x-icon"
      style="display: none"
      @change="handleFileChange"
    />

    <AppButton
      :text="logoUrl ? 'Re-Select Logo' : 'Upload Logo'"
      @click="ClickUpload"
    />

    <PreviewBox v-if="logoUrl" :logo-url="logoUrl" />

    <AppButton
      class="AppButton"
      :text="
        isSubmitting
          ? 'Processing...'
          : logoUrl
            ? 'Continue'
            : 'Continue without Logo'
      "
      :disabled="isSubmitting"
      @click="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import AppInputBox from "~/components/AppInputBox.vue";
import AppButton from "~/components/AppButton.vue";
import PreviewBox from "~/components/PreviewBox.vue";

const eventName = ref("");
const eventStartDate = ref("");
const eventEndDate = ref("");
const nameError = ref("");
const startError = ref("");
const endError = ref("");
const isSubmitting = ref(false);

// Logo state
const logoUrl = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const { createEvent, uploadEventLogo } = useEvent();

const handleSubmit = async () => {
  if (!eventName.value.trim()) {
    nameError.value = "Event name is required";
    return;
  }
  nameError.value = "";

  if (!eventStartDate.value.trim()) {
    startError.value = "Event start date is required";
    return;
  }
  startError.value = "";

  if (!eventEndDate.value.trim()) {
    endError.value = "Event end date is required";
    return;
  }
  endError.value = "";

  // Validate date logic (backend doesn't have date validation)
  const startDate = new Date(eventStartDate.value);
  const endDate = new Date(eventEndDate.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if start date is in the past
  if (startDate < today) {
    startError.value = "Start date cannot be in the past";
    return;
  }

  // Check if end date is before start date
  if (endDate < startDate) {
    endError.value = "End date cannot be before start date";
    return;
  }

  isSubmitting.value = true;

  try {
    const eventData = {
      name: eventName.value,
      startDate: eventStartDate.value,
      endDate: eventEndDate.value,
    };

    const eventResponse = await createEvent(eventData);

    if (selectedFile.value) {
      try {
        const eventId =
          "id" in eventResponse ? eventResponse.id : eventResponse.data?.id;
        if (!eventId) {
          throw new Error("No event ID available for logo upload");
        }
        await uploadEventLogo(eventId, selectedFile.value);
      } catch (logoError) {
        console.error("=== LOGO UPLOAD ERROR ===");
        console.error("Logo upload failed:", logoError);
        console.error("Error details:", logoError);
      }
    }
    const eventId =
      "id" in eventResponse ? eventResponse.id : eventResponse.data?.id;
    if (eventId) {
      await navigateTo(`/cameraPage?eventId=${eventId}`);
    } else {
      console.error("Failed to get event ID");
    }
  } catch (err) {
    console.error("Error submitting event:", err);
  } finally {
    isSubmitting.value = false;
  }
};

function ClickUpload() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  // If user did not pick any file, stop and do nothing
  if (!target.files?.length) return;

  const file = target.files[0];
  if (!file) return;
  selectedFile.value = file;

  // Give the logo an url to preview in browser
  logoUrl.value = URL.createObjectURL(file);
}
</script>

<style>
.createEvent {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-height: auto;
  overflow: hidden;
  box-sizing: border-box;
  padding: 16px;
}

.createEventForm {
  width: 85vw;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

h1 {
  margin-bottom: 20px;
  font-size: 2rem;
}

.AppButton {
  margin-top: 10px;
}

.error {
  color: red;
  font-size: 0.9rem;
  margin-bottom: 15px;
  text-align: left;
}

/* Responsive styles */
@media (min-width: 768px) {
  .createEventForm {
    margin: 28px auto;
    max-width: 500px;
  }
}

@media (min-width: 1024px) {
  .createEventForm {
    max-width: 600px;
  }
}
</style>

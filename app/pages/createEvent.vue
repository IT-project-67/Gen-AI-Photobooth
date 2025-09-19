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
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <AppInputBox
            id="eventStartDate"
            v-model="eventStartDate"
            label="Event Start Date"
            placeholder="Enter your event start date"
            type="date"
            :required="false"
          />

          <AppInputBox
            id="eventEndDate"
            v-model="eventEndDate"
            label="Event End Date"
            placeholder="Enter your event end date"
            type="date"
            :required="false"
          />
        </form>
      </div>
    </div>

    <input
      type="file"
      ref="fileInput"
      accept="image/png"
      style="display: none"
      @change="handleFileChange"
    />

    <AppButton
      :text="logoUrl ? 'Re-Select Logo' : 'Upload Logo'"
      @click="ClickUpload"
    />

    <PreviewBox v-if="logoUrl" :logoUrl="logoUrl" />

    <AppButton
      class="AppButton"
      :text="logoUrl ? 'Continue' : 'Continue without Logo'"
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
const errorMessage = ref("");

// Logo state
const logoUrl = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const handleSubmit = async () => {
  if (!eventName.value.trim()) {
    errorMessage.value = "Event name is required";
    return;
  }
  errorMessage.value = "";

  try {
    const body = {
      name: eventName.value,
      startDate: eventStartDate.value,
      endDate: eventEndDate.value,
    };

    const response = await fetch("/api/create-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error("Failed to create event");

    // const data = await response.json()
    console.log("Event created successfully");

    // navigateTo("/events/" + data.id)
  } catch (err) {
    console.error("Error submitting event:", err);
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

  // Give the logo an url to preview in browser
  logoUrl.value = URL.createObjectURL(file);

  // Prepare a package to send to server
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload-logo", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Upload failed");
    console.log("Uploaded successfully");
  } catch (err) {
    console.error("Upload error:", err);
  }
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

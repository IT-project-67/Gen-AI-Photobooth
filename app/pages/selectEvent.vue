<template>
  <div class="page">
    <div v-if="submittedEventID === ''" class="wrapper">
      <!-- title -->
      <h1 class="title">Return to Your Event!</h1>

      <!-- discription of drop down box -->
      <label class="select-label" for="event-select">Select an event: </label>

      <!-- drop down box -->
      <select v-model="selectedEventID" class="event-select" :disabled="isLoadingEvents">
        <!-- placeholder -->
        <option disabled value="">
          {{ isLoadingEvents ? 'Loading events...' : '-- Please choose an event --' }}
        </option>

        <!-- options -->
        <option v-for="event in events" :key="event.id" :value="event.id">
          {{ event.name }} ({{ event.startDate ? new Date(event.startDate).toLocaleDateString() : 'No date' }})
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
      <h1>Welcome back to {{ selectedEvent?.name || 'Your Event' }}!</h1>
      <br />
      <p class="event-info">
        Start Date: {{ selectedEvent?.createdAt ? new Date(selectedEvent.createdAt).toLocaleDateString() : 'Unknown' }}
        <span class="dot">•</span>
        End Date: {{ selectedEvent?.endDate ? new Date(selectedEvent.endDate).toLocaleDateString() : 'Unknown' }}
      </p>
      <p>Please confirm the event logo below before continuing.</p>
    </div>
    <!-- preview box -->
    <PreviewBox v-if="submittedEventID !== ''" :logo-url="eventLogoUrl" />

    <!-- continue button -->
    <AppButton
      v-if="submittedEventID !== ''"
      text="Continue"
      class="continue-button"
    />
    <AppButton
      v-if="submittedEventID !== ''"
      text="Reselect Event"
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
  import type { EventListItem, EventResponse, SignedUrlResponse } from "~~/server/types/events";

  const selectedEventID = ref("");
  const submittedEventID = ref("");
  const isSubmitting = ref(false);

  const events = ref<EventListItem[]>([]);
  const selectedEvent = ref<EventResponse | null>(null);
  const eventLogoUrl = ref("");
  const isLoadingEvents = ref(false);

  const { 
    getUserEvents, 
    getEventById, 
    getEventLogoSignedUrl 
  } = useEvent();

  onMounted(async () => {
    isLoadingEvents.value = true;
    try {
      const userEvents = await getUserEvents();
      events.value = (userEvents as EventListItem[]).map(event => ({
        id: event.id,
        name: event.name,
        logoUrl: event.logoUrl,
        startDate: event.startDate,
        endDate: event.endDate,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      }));
      
      console.log("Events mapped:", events.value);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      isLoadingEvents.value = false;
    }
  });

  const handleSubmit = async (): Promise<void> => {
    if (!selectedEventID.value) return;
    isSubmitting.value = true;
    try {
      // Get event details
      const eventDetails = await getEventById(selectedEventID.value);
      const event = eventDetails as EventResponse;
      selectedEvent.value = event;
      
      // Get event logo if available
      if (event?.logoUrl) {
        try {
          const signedUrlResponse = await getEventLogoSignedUrl(selectedEventID.value);
          const signedUrl = (signedUrlResponse as SignedUrlResponse).url;
          eventLogoUrl.value = signedUrl || "";
        } catch (logoError) {
          console.error("Failed to get event logo:", logoError);
          eventLogoUrl.value = "";
        }
      } else {
        eventLogoUrl.value = "";
      }
      submittedEventID.value = selectedEventID.value;
    } catch (error) {
      console.error("Failed to fetch event details:", error);
    } finally {
      isSubmitting.value = false;
    }
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

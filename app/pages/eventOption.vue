<template>
  <div class="eventOptionPage">
    <AppButton text="Create New Event" @click="clickCreate" />
    <br />
    <AppButton text="Select History Event" @click="clickSelect" />
  </div>
</template>

<script setup lang="ts">
// const router = useRouter();

const clickCreate = () => {
  // router.push("/createEvent")
  alert("create event page here");
};
const clickSelect = () => {
  // router.push("/selectEvent")
  alert("select event page here");
};
</script>

<style scoped>
.eventOptionPage {
  margin: 20px auto;
}
</style>

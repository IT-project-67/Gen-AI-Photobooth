
<script setup lang="ts">
   import { ref } from 'vue'
   // import { useShare } from ~/composables/useShare.ts
   // const { getQRCodeBlob } = useShare();

   const qrSrc  = ref<string | null>(null);
   const loading = ref(true);
   const error = ref<string | null>(null);
   async function loadQr() {
      loading.value = true
      error.value = null
      try {
         qrSrc.value = await getQRCodeBlob()   // expects a string URL
      } catch (e: any) {
         error.value = e?.message ?? 'Failed to load QR'
      } finally {
         loading.value = false
      }
   }
   onMounted(loadQr)
</script>



<template>
   <!-- when the QR code is being generated -->
 <div class="page">
   <div v-if = "qrSrc === null && error === null" class="center-full">
      <GeneratingSign></GeneratingSign>
   </div>
   <div v-else class="wrapper">
      <!-- error state -->
      <div v-if = "error" class="error-box">
         <p>{{ error }}</p>
        <button class="retry-button" @click="loadQr">Retry</button>
      </div>

      <div v-else-if="qrSrc">
         <!-- heading -->
         <h1>Scan the QR Code for Your Photo!</h1>
         <img :src="qrSrc">
      </div>
      

      <!-- QR code image -->
   </div>
 </div>
</template>


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

   .center-full {
      min-height: 70dvh;    
      display: grid;
      place-items: center; 
      padding: 1.5rem;
                
   }

   .retry-button:hover {
      background: linear-gradient(to right, #9b30ff, #ff85c1); /* brighter colors */
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* subtle shadow */
   }

   .retry-button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: linear-gradient(to right, #8a2be2, #ff69b4);
      color: white;
      margin-top: 15px;
      width: 100%;
   }
</style>
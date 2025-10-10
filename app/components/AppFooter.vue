<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-links">
        <a href="#" class="footer-link" @click="goToAboutUs">About Us</a>
        <a href="#" class="footer-link" @click="goToContactUs">Contact Us</a>
        <a href="#" class="footer-link" @click="goToPrivacyPolicy">Privacy Policy</a>
      </div>
      <div class="footer-extra-infos">Created by unimelb IT Project Group67.</div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const router = useRouter();

const goToAboutUs = () => {
  router.push("/");
};
const goToContactUs = () => {
  router.push("/");
};
const goToPrivacyPolicy = () => {
  router.push("/");
};
</script>

<style scoped>
.footer {
  width: 100%;
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  color: white;
  padding: 20px 0;
  margin-top: auto;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.footer-links {
  display: flex;
  gap: 15px;
}

.footer-link {
  color: white;
  text-decoration: none;
  font-size: 16px;
  transition: all 0.3s ease;
}

.footer-link:hover {
  text-decoration: underline;
}

.footer-link:active {
  transform: scale(0.9);
}

.footer-extra-infos {
  font-size: 14px;
  opacity: 0.8;
}

/* responsive design */
@media (max-width: 480px) {
  .footer-links {
    gap: 12px;
  }

  .footer-link {
    font-size: 14px;
  }

  .footer-extra-infos {
    font-size: 12px;
  }
}
</style>

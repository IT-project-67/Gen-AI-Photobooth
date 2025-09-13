<template>
  <div class="navbar">
    <div class="navbar-logo">
      <!-- app icon -->
      <img
        class="icon"
        src="/assets/images/icon-white.png"
        alt="icon"
        @click="goToHomePage"
      />
    </div>
    <div class="navbar-user">
      <!-- User not logged in -->
      <template v-if="!isLoggedIn">
        <span class="auth-button login" @click="goToLogIn">Log In</span>
        <span class="user-separator">|</span>
        <span class="auth-button signup" @click="goToSignUp">Sign Up</span>
        <img
          class="user-icon"
          src="/assets/images/user-icon.png"
          alt="user-icon"
          @click="goToLogIn"
        />
      </template>

      <!-- User already logged in -->
      <template v-else>
        <span class="auth-button">Welcome back, {{ username }}</span>
        <div class="user-menu" @click="openUserMenu">
          <img
            class="user-icon"
            src="/assets/images/user-icon.png"
            alt="user-icon"
          />
          <span class="down-arrow">▼</span>
        </div>

        <div v-if="showUserMenu" class="user-menu">
          <div class="menu-dropdown" @click="goToProfile">
            <span class="menu-item">👤</span>
            <span>Profile</span>
          </div>
          <div class="menu-dropdown" @click="goToSettings">
            <span class="menu-item">⚙️</span>
            <span>Settings</span>
          </div>
          <div class="menu-dropdown" @click="handleLogout">
            <span class="menu-item">🚪</span>
            <span>Log Out</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const isLoggedIn = ref(false);
const username = ref("");
const showUserMenu = ref(false);
const router = useRouter();

const goToLogIn = () => {
  router.push("/login");
};
const goToSignUp = () => {
  router.push("/signup");
};
const goToHomePage = () => {
  router.push("/");
};
const goToProfile = () => {
  router.push("/");
};
const goToSettings = () => {
  router.push("/");
};
const openUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};
const handleLogout = async () => {
  await router.push("/");
};
</script>

<style scoped>
.navbar {
  background: linear-gradient(to right, #8a2be2, #ff69b4);
  color: white;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-logo {
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.navbar-logo:active {
  transform: scale(0.9);
}

.navbar-logo .icon {
  width: 45px;
  height: 45px;
}

.navbar-user {
  display: flex;
  align-items: center;
  /* gap: 0px; */
}

.navbar-user .auth-button {
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  font-size: 15px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-decoration: underline;
}

.navbar-user .auth-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1);
}

.navbar-user .auth-button:active {
  transform: scale(0.95);
}

.navbar-user .user-separator {
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  margin: 0 4px;
  font-weight: bold;
}

.navbar-user .user-icon {
  width: 45px;
  height: 45px;
  margin-left: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.navbar-user .user-icon:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
}

.navbar-user .user-icon:active {
  transform: scale(0.9);
}

@media (max-width: 480px) {
  .navbar-logo .icon {
    width: 35px;
    height: 35px;
  }

  .navbar-user .auth-button {
    font-size: 14px;
  }
  .navbar-user .user-icon {
    width: 35px;
    height: 35px;
  }
}
</style>

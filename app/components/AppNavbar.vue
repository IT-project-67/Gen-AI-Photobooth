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
      <template v-if="!user">
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
        <span class="welcome-text">Welcome Back!</span>
        <div class="user-menu" @click="toggleUserMenu">
          <img
            class="user-menu-icon"
            src="/assets/images/user-icon.png"
            alt="user-icon"
          />
          <span class="down-arrow">▼</span>
        </div>

        <div v-if="showUserMenu" class="menu-dropdown">
          <div class="menu-item" @click="goToProfile">
            <span class="menu-icon">👤</span>
            <span>Profile</span>
          </div>
          <div class="menu-divider"></div>
          <div class="menu-item logout-item" @click="handleLogout">
            <span class="menu-icon">🚪</span>
            <span>Log Out</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const { logout } = useAuth();
const user = useSupabaseUser();
const username = ref("");

// const email = computed(() => user.value?.email)

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
  showUserMenu.value = false;
  alert("Profile not available yet, please wait for future development");
};
const toggleUserMenu = () => {
  showUserMenu.value = true;
};
const handleLogout = async () => {
  const { error } = await logout();
  if (error) {
    console.error("Logout error:", error);
    alert("Logout failed: " + error);
  }
  showUserMenu.value = false;
  router.push("/");
  console.log("success");
};

// when clicking outside the dropdown menu, close the dropdown menu
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".user-menu") && !target.closest(".user-dropdown")) {
    showUserMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
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

.welcome-text {
  color: white;
  font-size: 15px;
  font-weight: 600;
  padding: 4px 8px;
}

.user-menu {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 5px 2px;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
}

.user-menu:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.user-menu:active {
  transform: scale(0.95);
}

.user-menu .user-menu-icon {
  width: 45px;
  height: 45px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-menu:hover .user-menu-icon {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
}

.down-arrow {
  color: white;
  font-size: 15px;
  transition: transform 0.3s ease;
}

.down-arrow:active {
  transform: scale(0.85);
}

.user-menu:hover .down-arrow {
  transform: rotate(180deg) scale(1.1);
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: #f9f2f7;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
  animation: dropdownFadeIn 0.4s ease-out;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 16px;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background-color: #e6e6e6;
}

.menu-item:active {
  transform: scale(0.9);
}

.menu-item.logout-item {
  color: red;
}

.menu-item.logout-item:hover {
  background-color: rgb(255, 220, 220);
}

.menu-icon {
  margin-right: 15px;
  font-size: 20px;
  width: 20px;
  text-align: center;
}

.menu-divider {
  height: 1px;
  background-color: #e0e3e6;
  margin: 4px 0;
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

  .welcome-text {
    font-size: 14px;
  }

  .user-menu .user-menu-icon {
    width: 35px;
    height: 35px;
  }

  .down-arrow {
    font-size: 12px;
  }
}
</style>

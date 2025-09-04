<template>
    <div class="navbar">
        <div class="navbar-logo">
            <!-- app icon -->
            <img class="icon" src="/assets/images/icon_shiro.png" alt="icon" width="50" height="50" @click="goToHomePage">
        </div>
        <div class="navbar-user">
            <!-- login and signup button -->
            <span class="auth-button login" @click="goToLogIn">Log In</span>
            <span class="user-separator">|</span>
            <span class="auth-button signup" @click="goToSignUp">Sign Up</span>
            <img class="user-icon" src="/assets/images/user-icon.png" alt="user-icon" width="50" height="50" @click="goToUserPage">
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'Navbar',
    methods: {
        goToLogIn() {
            this.$router.push('/')
        },
        goToSignUp() {
            this.$router.push('/SignUp')
        },
        goToUserPage() {
            this.$router.push('/UserProfile')
        },
        goToHomePage() {
            this.$router.push('/')
        }
    }
}
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
    margin-bottom: 20px;
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

.navbar-user {
    display: flex;
    align-items: center;
    gap: 4px;
}

.navbar-user .auth-button {
    cursor: pointer;
    transition: all 0.3s ease;
    user-select: none;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 4px;
}

.navbar-user .auth-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1);
}

.navbar-user .user-separator {
    color: rgba(255, 255, 255, 0.6);
    font-size: 20px;
    margin: 0 4px;
}

.navbar-user .user-icon {
    width: 30px;
    height: 30px;
    margin-left: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.navbar-user .user-icon:hover {
    transform: scale(1.2);
    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
}

.navbar-user .user-icon:active {
    transform: scale(0.9);
}
</style>
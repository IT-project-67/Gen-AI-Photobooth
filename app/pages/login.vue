<template>
  <div class="login-page">
    <AuthForm
      title="Log in to Your Account"
      button-text="Log in"
      :show-confirm-password="false"
      :show-forgot-password="true"
      :switch-to-sign-up="true"
    />
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  overflow: hidden; /* prevent scrollbars */
  box-sizing: border-box;
  padding: 0 16px; /* horizontal padding only */
}
</style>

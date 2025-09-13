// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default (async() => {
    const NuxtConfig = await withNuxt();

    return [
        ...NuxtConfig,
        {
            files: ['**/*.vue'],
            rules: {
                "vue/html-self-closing": "off"
            }
        }
    ]
})()

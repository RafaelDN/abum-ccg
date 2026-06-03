import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true'
const isUserOrOrgPage = repositoryName?.endsWith('.github.io')

export default defineConfig({
  base: isGitHubPagesBuild && repositoryName && !isUserOrOrgPage ? `/${repositoryName}/` : '/',
  plugins: [vue()],
})

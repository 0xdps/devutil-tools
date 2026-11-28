import { SITE_NAME, SITE_URL } from '@/tools/catalog'

export const site = {
  name: SITE_NAME,
  fullName: SITE_NAME,
  tagline: 'Free, private developer tools that run in your browser',
  url: SITE_URL,
  // The GitHub repository keeps its original name until it is renamed there.
  repoUrl: 'https://github.com/0xdps/devutil-tools',
  issuesUrl: 'https://github.com/0xdps/devutil-tools/issues',
  authorUrl: 'https://0xdps.xyz',
  donateUrl: 'https://buymeacoffee.com/0xdps',
} as const

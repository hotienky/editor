import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Kindy Editor",
  description: "Canvas-based Word Document Editor Documentation",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Public Events', link: '/public-events' },
      { text: 'HTTP Event Sink', link: '/http-event-sink' },
    ],
    sidebar: [
      {
        text: 'Integration & Events',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Public Events API', link: '/public-events' },
          { text: 'HTTP Event Sink', link: '/http-event-sink' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hotienky/editor' }
    ]
  }
})

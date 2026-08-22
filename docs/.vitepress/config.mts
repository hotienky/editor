import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kindy Editor',
  description: 'DOCX Document Library SDK & Vue 3 Editor with Headless Core',
  lang: 'vi-VN',
  base: '/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  srcExclude: ['**/architecture/**', '**/packages/**', '**/research/**', '**/epic-story-task/**', '**/adr/**', '**/rfc/**'],

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#0b74de' }],
    ['meta', { name: 'keywords', content: 'docx, editor, tiptap, prosemirror, vue3, document library, rich text, contract editor' }],
  ],

  themeConfig: {
    siteTitle: 'Kindy Editor v2',
    logo: '/logo.svg',

    nav: [
      { text: 'Hướng dẫn', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'Kiến trúc & Lưu trữ', link: '/architecture/overview', activeMatch: '/architecture/' },
      { text: 'Tích hợp Backend', link: '/integration/rest-adapter', activeMatch: '/integration/' },
      { text: 'API Reference', link: '/api/components', activeMatch: '/api/' },
      { text: 'Live Demo', link: '/examples/live-demo', activeMatch: '/examples/' },
      {
        text: 'v2.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/hotienky/editor/blob/main/CHANGELOG.md' },
          { text: 'DOCX Capabilities Matrix', link: 'https://github.com/hotienky/editor/blob/main/CAPABILITIES.md' },
          { text: 'Migration Guide (v1 → v2)', link: 'https://github.com/hotienky/editor/blob/main/MIGRATION.md' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Bắt đầu',
          items: [
            { text: 'Giới thiệu & Tổng quan', link: '/guide/introduction' },
            { text: 'Bắt đầu tích hợp (Quick Start)', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Tính năng cốt lõi',
          items: [
            { text: 'UI Engine & Theme System', link: '/guide/ui-engine' },
            { text: 'DOCX Codec & Print/PDF', link: '/guide/docx-codecs' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Kiến trúc hệ thống',
          items: [
            { text: 'Tổng quan kiến trúc phân tầng', link: '/architecture/overview' },
            { text: 'Mô hình lưu trữ & Concurrency', link: '/architecture/storage-and-state' },
            { text: 'Cộng tác Realtime (Yjs)', link: '/architecture/collaboration' },
          ],
        },
      ],
      '/integration/': [
        {
          text: 'Tích hợp Backend & Storage',
          items: [
            { text: 'Thiết kế Database & Backend', link: '/integration/database-setup' },
            { text: 'REST Document Adapter', link: '/integration/rest-adapter' },
            { text: 'Tự viết Custom Adapter', link: '/integration/custom-adapter' },
            { text: 'OpenAPI 3.1 Contract', link: '/integration/openapi-spec' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Tra cứu API',
          items: [
            { text: 'UI Components', link: '/api/components' },
            { text: 'Headless Client & Core', link: '/api/client-core' },
            { text: 'Data Types & Interfaces', link: '/api/types-and-schemas' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Ví dụ & Trải nghiệm',
          items: [
            { text: 'Trải nghiệm Live Demo', link: '/examples/live-demo' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Tìm kiếm tài liệu...',
                buttonAriaLabel: 'Tìm kiếm tài liệu',
              },
              modal: {
                noResultsText: 'Không tìm thấy kết quả',
                resetButtonTitle: 'Xóa tìm kiếm',
                footer: {
                  selectText: 'chọn',
                  navigateText: 'chuyển',
                  closeText: 'đóng',
                },
              },
            },
          },
        },
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hotienky/editor' },
    ],

    footer: {
      message: 'Phát hành dưới giấy phép MIT License.',
      copyright: 'Copyright © 2024-2026 Kindy (kyit1506@gmail.com)',
    },

    outline: {
      level: [2, 3],
      label: 'Mục lục trang',
    },

    docFooter: {
      prev: 'Trang trước',
      next: 'Trang tiếp theo',
    },

    darkModeSwitchLabel: 'Giao diện',
    lightModeSwitchTitle: 'Chuyển sang nền sáng',
    darkModeSwitchTitle: 'Chuyển sang nền tối',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Lên đầu trang',
  },
})

<template>
  <div class="docs-app" :data-theme="isDark ? 'dark' : 'light'">
    <!-- Header -->
    <header class="docs-header">
      <a href="#" class="brand">
        📝 Kindy Editor
        <span class="brand-badge">v1.0.0</span>
      </a>

      <div class="header-actions">
        <a href="#playground" class="nav-link">Live Demo</a>
        <a href="#frameworks" class="nav-link">Frameworks</a>
        <a href="#api" class="nav-link">API Reference</a>
        <button class="btn-theme" @click="isDark = !isDark">
          {{ isDark ? '☀️ Light' : '🌙 Dark' }}
        </button>
      </div>
    </header>

    <!-- Body Layout -->
    <div class="docs-body">
      <!-- Sidebar -->
      <aside class="docs-sidebar">
        <div class="menu-group">
          <div class="menu-group-title">Bắt đầu</div>
          <a
            v-for="item in navOverview"
            :key="item.id"
            :href="`#${item.id}`"
            class="menu-item"
            :class="{ active: activeSection === item.id }"
            @click="activeSection = item.id"
          >
            {{ item.title }}
          </a>
        </div>

        <div class="menu-group">
          <div class="menu-group-title">Nền tảng (Frameworks)</div>
          <a
            v-for="item in navFrameworks"
            :key="item.id"
            :href="`#${item.id}`"
            class="menu-item"
            :class="{ active: activeSection === item.id }"
            @click="activeSection = item.id"
          >
            {{ item.title }}
          </a>
        </div>

        <div class="menu-group">
          <div class="menu-group-title">API & Tính năng</div>
          <a
            v-for="item in navApi"
            :key="item.id"
            :href="`#${item.id}`"
            class="menu-item"
            :class="{ active: activeSection === item.id }"
            @click="activeSection = item.id"
          >
            {{ item.title }}
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="docs-main">
        <!-- Hero Section -->
        <section id="overview" class="section">
          <h1 class="section-title">Trình biên tập tài liệu chuẩn Office dành cho Web</h1>
          <p class="section-subtitle">
            Dựa trên <strong>Vue 3</strong> và <strong>Tiptap 3</strong>. Hỗ trợ ngắt trang chuẩn Word, bình luận tọa độ Y, 100% Tiếng Việt và tích hợp đa nền tảng (React, Next.js, Nuxt, Angular, Svelte).
          </p>

          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon">📄</div>
              <div class="feature-title">Phân trang dạng Word</div>
              <div class="feature-desc">Hỗ trợ khổ giấy A4, A3, Letter, ngắt trang, căn lề và Header/Footer chuẩn MS Word.</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">💬</div>
              <div class="feature-title">Bình luận tọa độ Y</div>
              <div class="feature-desc">Bôi đen văn bản để gắn bình luận, phản hồi reply, hoàn thành resolve mượt mà.</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🇻🇳</div>
              <div class="feature-title">Tiếng Việt 100%</div>
              <div class="feature-desc">Toàn bộ nhãn giao diện, bộ cỡ chữ tiêu chuẩn pt và phông hệ thống nét mịn.</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">⚡</div>
              <div class="feature-title">Đa nền tảng</div>
              <div class="feature-desc">Chạy tốt trên Vue 3, React, Next.js, Nuxt 3, Angular, Svelte và Vanilla JS.</div>
            </div>
          </div>
        </section>

        <!-- Quick Start -->
        <section id="installation" class="section">
          <h2 class="section-title">📦 Cài đặt Nhanh</h2>
          <div class="card">
            <p>Cài đặt gói <code>kindy-editor</code> qua NPM, PNPM hoặc Yarn:</p>
            <div class="code-box">
              <code>npm install kindy-editor</code>
              <button class="copy-btn" @click="copyCode('npm install kindy-editor')">Copy</button>
            </div>
          </div>
        </section>

        <!-- Live Playground -->
        <section id="playground" class="section">
          <h2 class="section-title">🎛️ Live Interactive Demo</h2>
          <p class="section-subtitle">Thử nghiệm trực tiếp trình biên tập Kindy Editor ngay trên trang tài liệu:</p>
          <div class="playground-wrapper">
            <KindyEditor ref="editorRef" v-bind="demoOptions" />
          </div>
        </section>

        <!-- Frameworks Integration -->
        <section id="frameworks" class="section">
          <h2 class="section-title">🌐 Hướng dẫn Tích hợp theo Framework</h2>

          <div class="tabs">
            <button
              v-for="fw in frameworks"
              :key="fw.id"
              class="tab-btn"
              :class="{ active: activeFw === fw.id }"
              @click="activeFw = fw.id"
            >
              {{ fw.name }}
            </button>
          </div>

          <div class="card">
            <h3>{{ currentFw.name }} Integration</h3>
            <p style="margin-top: 6px; color: var(--text-muted);">{{ currentFw.desc }}</p>
            <div class="code-box">
              <pre><code>{{ currentFw.code }}</code></pre>
              <button class="copy-btn" @click="copyCode(currentFw.code)">Copy Code</button>
            </div>
          </div>
        </section>

        <!-- Props API -->
        <section id="props-api" class="section">
          <h2 class="section-title">⚙️ Props & Options API</h2>
          <div class="card">
            <table class="api-table">
              <thead>
                <tr>
                  <th>Thuộc tính</th>
                  <th>Kiểu dữ liệu</th>
                  <th>Mặc định</th>
                  <th>Mô tả</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>locale</code></td>
                  <td><span class="type-badge">string</span></td>
                  <td><code>'vi-VN'</code></td>
                  <td>Ngôn ngữ giao diện (<code>vi-VN</code>, <code>en-US</code>, <code>zh-CN</code>)</td>
                </tr>
                <tr>
                  <td><code>theme</code></td>
                  <td><span class="type-badge">string</span></td>
                  <td><code>'light'</code></td>
                  <td>Chế độ giao diện (<code>light</code>, <code>dark</code>, <code>auto</code>)</td>
                </tr>
                <tr>
                  <td><code>toolbar.mode</code></td>
                  <td><span class="type-badge">string</span></td>
                  <td><code>'ribbon'</code></td>
                  <td>Chế độ thanh công cụ (<code>ribbon</code> hoặc <code>classic</code>)</td>
                </tr>
                <tr>
                  <td><code>document.content</code></td>
                  <td><span class="type-badge">string | object</span></td>
                  <td><code>''</code></td>
                  <td>Nội dung HTML hoặc JSON ban đầu của tài liệu</td>
                </tr>
                <tr>
                  <td><code>onSave</code></td>
                  <td><span class="type-badge">function</span></td>
                  <td><code>null</code></td>
                  <td>Callback khi người dùng bấm Lưu hoặc ấn <code>Ctrl + S</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Methods API -->
        <section id="methods-api" class="section">
          <h2 class="section-title">🛠️ Methods API (Ref Instance)</h2>
          <div class="card">
            <table class="api-table">
              <thead>
                <tr>
                  <th>Phương thức</th>
                  <th>Tham số</th>
                  <th>Mô tả</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>getContent(type)</code></td>
                  <td><code>'html' | 'json' | 'text'</code></td>
                  <td>Lấy nội dung tài liệu theo định dạng HTML, JSON hoặc Plain Text.</td>
                </tr>
                <tr>
                  <td><code>setContent(content)</code></td>
                  <td><code>string | object</code></td>
                  <td>Đặt nội dung mới cho trình biên tập.</td>
                </tr>
                <tr>
                  <td><code>exportPdf(filename)</code></td>
                  <td><code>string</code></td>
                  <td>Xuất tài liệu hiện tại ra tệp PDF.</td>
                </tr>
                <tr>
                  <td><code>exportImage(format)</code></td>
                  <td><code>'png' | 'jpeg'</code></td>
                  <td>Xuất trang thành hình ảnh PNG/JPEG.</td>
                </tr>
                <tr>
                  <td><code>print()</code></td>
                  <td>None</td>
                  <td>Mở hộp thoại in tài liệu chuẩn trình duyệt.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Comments & Database -->
        <section id="comments-db" class="section">
          <h2 class="section-title">💬 Hệ thống Bình luận & Database</h2>
          <div class="card">
            <h3>Cơ chế Lưu vết Bình luận</h3>
            <p style="margin-top: 8px; color: var(--text-muted);">
              Bình luận được tự động mã hóa nhúng trong thẻ <code>&lt;span data-comment="..." data-thread="..."&gt;</code>. Khi bạn lưu chuỗi HTML này vào cột <code>content</code> trong Database và load lại, toàn bộ Bình luận + Sidebar + Highlight sẽ được khôi phục 100%!
            </p>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { KindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

const isDark = ref(false)
const activeSection = ref('overview')
const activeFw = ref('vue3')
const editorRef = ref(null)

const navOverview = [
  { id: 'overview', title: 'Tổng quan & Tính năng' },
  { id: 'installation', title: 'Cài đặt Nhanh' },
  { id: 'playground', title: 'Live Demo Playground' },
]

const navFrameworks = [
  { id: 'frameworks', title: 'Tích hợp Framework' },
]

const navApi = [
  { id: 'props-api', title: 'Props & Options API' },
  { id: 'methods-api', title: 'Methods API (Ref)' },
  { id: 'comments-db', title: 'Bình luận & Database' },
]

const frameworks = [
  {
    id: 'vue3',
    name: 'Vue 3',
    desc: 'Tích hợp dạng Vue 3 Component hoặc Global Plugin',
    code: `<template>
  <KindyEditor ref="editorRef" v-bind="editorOptions" />
</template>

<script setup>
import { ref } from 'vue'
import { KindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

const editorOptions = ref({
  locale: 'vi-VN',
  document: { content: '<h1>Tài liệu Vue 3</h1>' }
})
<\/script>`,
  },
  {
    id: 'react',
    name: 'React.js',
    desc: 'Tích hợp trong React qua mountKindyEditor hook',
    code: `import React, { useEffect, useRef } from 'react'
import { mountKindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

export function KindyEditorReact(props) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const instance = mountKindyEditor(containerRef.current, props)
    return () => instance.unmount()
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
}`,
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    desc: 'Client Component tích hợp next/dynamic (ssr: false)',
    code: `'use client'
import dynamic from 'next/dynamic'

const KindyEditor = dynamic(
  () => import('./KindyEditorReact').then((mod) => mod.KindyEditorReact),
  { ssr: false }
)

export default function Page() {
  return <KindyEditor locale="vi-VN" />
}`,
  },
  {
    id: 'angular',
    name: 'Angular',
    desc: 'Angular Component với ElementRef',
    code: `import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { mountKindyEditor } from 'kindy-editor';
import 'kindy-editor/style';

@Component({
  selector: 'app-kindy-editor',
  template: \`<div #editorContainer style="height: 100vh;"></div>\`
})
export class KindyEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  private instance: any;

  ngAfterViewInit() {
    this.instance = mountKindyEditor(this.editorContainer.nativeElement, { locale: 'vi-VN' });
  }

  ngOnDestroy() {
    this.instance?.unmount();
  }
}`,
  },
  {
    id: 'svelte',
    name: 'Svelte',
    desc: 'Svelte Component với onMount / onDestroy',
    code: `<script>
  import { onMount, onDestroy } from 'svelte';
  import { mountKindyEditor } from 'kindy-editor';
  import 'kindy-editor/style';

  let container;
  let instance;

  onMount(() => {
    instance = mountKindyEditor(container, { locale: 'vi-VN' });
  });

  onDestroy(() => {
    instance?.unmount();
  });
<\/script>

<div bind:this={container} style="height: 100vh;"></div>`,
  },
  {
    id: 'cdn',
    name: 'Vanilla JS / CDN',
    desc: 'Tích hợp qua thẻ script trực tiếp trên file HTML',
    code: `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/kindy-editor/dist/kindy-editor.css">
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"><\/script>
  <script src="https://unpkg.com/kindy-editor/dist/kindy-editor.iife.js"><\/script>
</head>
<body>
  <div id="editor" style="height: 100vh;"></div>
  <script>
    const { mountKindyEditor } = KindyEditor;
    mountKindyEditor('#editor', { locale: 'vi-VN' });
  <\/script>
</body>
</html>`,
  },
]

const currentFw = computed(() => frameworks.find((f) => f.id === activeFw.value) || frameworks[0])

const demoOptions = ref({
  locale: 'vi-VN',
  document: {
    title: 'Tài liệu Hướng dẫn Trực quan Kindy Editor',
    content: '<h1>Chào mừng bạn đến với Kindy Editor!</h1><p>Bôi đen đoạn văn bản bất kỳ và chọn biểu tượng <strong>Bình luận</strong> trên thanh công cụ để trải nghiệm tính năng bình luận tọa độ Y chuẩn Word.</p>',
  },
})

const copyCode = (text) => {
  navigator.clipboard.writeText(text)
  alert('Đã sao chép mã nguồn vào bộ nhớ tạm!')
}
</script>

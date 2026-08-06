<template>
  <menus-button
    ico="upload"
    text="Import Word (.docx)"
    huge
    @menu-click="triggerFileInput"
  />
  <input
    ref="fileInputRef"
    type="file"
    accept=".docx,.doc,.html,.htm"
    style="display: none;"
    @change="handleFileChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import { renderAsync } from 'docx-preview'
import mammoth from 'mammoth'

const editor = inject('editor')
const pageOptions = inject('page')
const fileInputRef = ref(null)

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file || !editor.value) return

  try {
    const arrayBuffer = await file.arrayBuffer()

    // 1. Try high-fidelity rendering with docx-preview
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    document.body.appendChild(container)

    let html = ''

    try {
      await renderAsync(arrayBuffer, container, null, {
        inWrapper: false,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: false,
        experimental: true,
      })
      html = container.innerHTML
    } catch (e) {
      console.warn('docx-preview failed, falling back to mammoth:', e)
    } finally {
      document.body.removeChild(container)
    }

    // 2. Fallback to mammoth if docx-preview output is empty
    if (!html || html.trim() === '') {
      const options = {
        styleMap: [
          "p[style-name='Header'] => div.docx-header > p:fresh",
          "p[style-name='Footer'] => div.docx-footer > p:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "b => strong",
          "i => em",
          "u => u",
          "strike => s",
        ],
        convertImage: mammoth.images.imgElement((image) => {
          return image.read('base64').then((imageBuffer) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`,
              style: 'max-width: 100%; height: auto; object-fit: contain;',
            }
          })
        }),
      }
      const result = await mammoth.convertToHtml({ arrayBuffer }, options)
      html = result.value
    }

    if (html) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // Auto extract Header logo if present in header section
      if (pageOptions?.value) {
        const headerImg = doc.querySelector('.docx-header img, header img, table:first-child img, img')
        if (headerImg && headerImg.src) {
          pageOptions.value.header.enable = true
          pageOptions.value.header.logo = headerImg.src
        }
      }

      const cleanHtml = doc.body ? doc.body.innerHTML : html
      editor.value.commands.setContent(cleanHtml)
    }
  } catch (err) {
    console.error('Lỗi khi đọc file Word:', err)
  } finally {
    event.target.value = ''
  }
}
</script>

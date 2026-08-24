import { createElement } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { Catalog, Footer, Ribbon } from './react'
import solarDoc from '../260401 - LE -001 - HD mua ban Solar.json'
import { commentList, options } from './mock'
import './style.css'
import Editor, {
  Command,
  EditorMode,
  EditorZone,
  ElementType,
  ICatalogItem,
  IEditorData,
  IEditorOption,
  KeyMap
} from './editor'
import { Dialog } from './components/dialog/Dialog'
import { Signature } from './components/signature/Signature'
import { debounce, nextTick, scrollIntoView } from './utils'

window.onload = function () {
  // 1. Khởi tạo trình soạn thảo
  const container = document.querySelector<HTMLDivElement>('.editor')!
  const instance = new Editor(
    container,
    <IEditorData>(<unknown>solarDoc.data),
    {
      ...options,
      ...((solarDoc.options as unknown as IEditorOption) || {}),
      maskMargin: [99, 0, 32, 0]
    }
  )
  console.log('Instance: ', instance)
  // dùng cho cypress
  Reflect.set(window, 'editor', instance)
  // dùng cho canvas-editor-devtools
  Reflect.set(window, '__CANVAS_EDITOR_INSTANCE__', instance)

  // 2. Render Ribbon, Catalog & Footer bằng Ant Design
  let isCatalogShow = true
  const menuDom = document.querySelector<HTMLElement>('.menu')!
  const catalogDom = document.querySelector<HTMLElement>('.catalog')!
  const footerDom = document.querySelector<HTMLElement>('.footer')!
  let menuRoot: Root | null = null
  let catalogRoot: Root | null = null
  let footerRoot: Root | null = null

  const renderRibbon = () => {
    if (!menuDom) return
    if (!menuRoot) {
      menuRoot = createRoot(menuDom)
    }
    menuRoot.render(
      createElement(Ribbon, {
        editor: instance,
        isCatalogOpen: isCatalogShow,
        onCatalogToggle: switchCatalog
      })
    )
  }

  const renderCatalog = (catalogData?: ICatalogItem[]) => {
    if (!catalogDom) return
    if (!catalogRoot) {
      catalogRoot = createRoot(catalogDom)
    }
    catalogRoot.render(
      createElement(Catalog, {
        editor: instance,
        data: catalogData,
        visible: isCatalogShow,
        onClose: () => {
          if (isCatalogShow) {
            switchCatalog()
          }
        }
      })
    )
  }

  const renderFooter = () => {
    if (!footerDom) return
    if (!footerRoot) {
      footerRoot = createRoot(footerDom)
    }
    footerRoot.render(
      createElement(Footer, {
        editor: instance,
        isCatalogOpen: isCatalogShow,
        onCatalogToggle: switchCatalog
      })
    )
  }

  async function updateCatalog() {
    if (!isCatalogShow) return
    const catalog = await instance.command.getCatalog()
    renderCatalog(catalog || [])
  }

  const switchCatalog = () => {
    isCatalogShow = !isCatalogShow
    if (isCatalogShow) {
      catalogDom.style.display = 'flex'
      updateCatalog()
    } else {
      catalogDom.style.display = 'none'
      renderCatalog([])
    }
    renderRibbon()
    renderFooter()
  }

  // Render ban đầu
  renderRibbon()
  updateCatalog()
  renderFooter()

  // Tự động cập nhật --wps-ribbon-height theo chiều cao thực của ribbon
  // để catalog không bị che
  const syncRibbonHeight = () => {
    const h = menuDom.getBoundingClientRect().height
    document.body.style.setProperty(
      '--wps-ribbon-height',
      `${h}px`
    )
    document.body.style.setProperty(
      '--wps-editor-margin-top',
      `${h + 22}px`
    )
  }
  const ribbonResizeObserver = new ResizeObserver(syncRibbonHeight)
  ribbonResizeObserver.observe(menuDom)

  // Phím tắt toàn cục: F11 toàn màn hình, Ctrl+S lưu JSON
  window.addEventListener('keydown', evt => {
    if (evt.key === 'F11') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
      evt.preventDefault()
    } else if (
      (evt.ctrlKey || evt.metaKey) &&
      evt.key.toLowerCase() === 's'
    ) {
      evt.preventDefault()
      instance.command.executeExportJson('canvas-editor-document.json')
    }
  })

  // Mô phỏng bình luận
  const commentDom = document.querySelector<HTMLDivElement>('.comment')!
  async function updateComment() {
    if (!commentDom) return
    const groupIds = await instance.command.getGroupIds()
    for (const comment of commentList) {
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${comment.id}']`
      )
      // Trình soạn thảo có tồn tại group id tương ứng không
      if (groupIds.includes(comment.id)) {
        // Dom hiện tại có tồn tại không - không tồn tại thì thêm mới
        if (!activeCommentDom) {
          const commentItem = document.createElement('div')
          commentItem.classList.add('comment-item')
          commentItem.setAttribute('data-id', comment.id)
          commentItem.onclick = () => {
            instance.command.executeLocationGroup(comment.id)
          }
          commentDom.append(commentItem)
          // Thông tin vùng chọn
          const commentItemTitle = document.createElement('div')
          commentItemTitle.classList.add('comment-item__title')
          commentItemTitle.append(document.createElement('span'))
          const commentItemTitleContent = document.createElement('span')
          commentItemTitleContent.innerText = comment.rangeText
          commentItemTitle.append(commentItemTitleContent)
          const closeDom = document.createElement('i')
          closeDom.onclick = () => {
            instance.command.executeDeleteGroup(comment.id)
          }
          commentItemTitle.append(closeDom)
          commentItem.append(commentItemTitle)
          // Thông tin cơ bản
          const commentItemInfo = document.createElement('div')
          commentItemInfo.classList.add('comment-item__info')
          const commentItemInfoName = document.createElement('span')
          commentItemInfoName.innerText = comment.userName
          const commentItemInfoDate = document.createElement('span')
          commentItemInfoDate.innerText = comment.createdDate
          commentItemInfo.append(commentItemInfoName)
          commentItemInfo.append(commentItemInfoDate)
          commentItem.append(commentItemInfo)
          // Bình luận chi tiết
          const commentItemContent = document.createElement('div')
          commentItemContent.classList.add('comment-item__content')
          commentItemContent.innerText = comment.content
          commentItem.append(commentItemContent)
          commentDom.append(commentItem)
        }
      } else {
        // Nếu editor không tồn tại group id tương ứng thì xóa dom
        activeCommentDom?.remove()
      }
    }
  }

  // Lắng nghe vùng chọn để active bình luận
  instance.listener.rangeStyleChange = function (payload) {
    if (!commentDom) return
    commentDom
      .querySelectorAll<HTMLDivElement>('.comment-item')
      .forEach(commentItemDom => {
        commentItemDom.classList.remove('active')
      })
    if (payload.groupIds) {
      const [id] = payload.groupIds
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${id}']`
      )
      if (activeCommentDom) {
        activeCommentDom.classList.add('active')
        scrollIntoView(commentDom, activeCommentDom)
      }
    }
  }

  const handleContentChange = async function () {
    // Mục lục
    if (isCatalogShow) {
      nextTick(() => {
        updateCatalog()
      })
    }
    // Bình luận
    nextTick(() => {
      updateComment()
    })
  }
  instance.listener.contentChange = debounce(handleContentChange, 200)
  handleContentChange()

  instance.listener.saved = function (payload) {
    console.log('saved payload: ', payload)
    instance.command.executeExportJson('canvas-editor-document.json')
  }

  // 9. Đăng ký menu chuột phải
  // Macro: khôi phục macro đã lưu từ localStorage
  const MACRO_STORAGE_KEY = 'canvas-editor:macros'
  const saved = localStorage.getItem(MACRO_STORAGE_KEY)
  if (saved) {
    instance.macro.importMacros(saved)
  }
  instance.register.contextMenuList([
    {
      name: 'Bình luận',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.editorHasSelection &&
          payload.zone === EditorZone.MAIN
        )
      },
      callback: (command: Command) => {
        new Dialog({
          title: 'Bình luận',
          data: [
            {
              type: 'textarea',
              label: 'Bình luận',
              height: 100,
              name: 'value',
              required: true,
              placeholder: 'Vui lòng nhập bình luận'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            const groupId = command.executeSetGroup()
            if (!groupId) return
            commentList.push({
              id: groupId,
              content: value,
              userName: 'Hufe',
              rangeText: command.getRangeText(),
              createdDate: new Date().toLocaleString()
            })
          }
        })
      }
    },
    {
      name: 'Thêm chú thích',
      icon: 'caption',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.startElement?.type === ElementType.IMAGE &&
          !payload.startElement?.imgCaption
        )
      },
      callback: (command: Command) => {
        new Dialog({
          title: 'Thêm chú thích',
          data: [
            {
              type: 'text',
              label: 'Nội dung chú thích',
              name: 'value',
              required: true,
              placeholder: 'Vui lòng nhập nội dung chú thích, dùng {imageNo} cho số thứ tự hình ảnh'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            command.executeSetImageCaption({
              value
            })
          }
        })
      }
    },
    {
      name: 'Sửa chú thích',
      icon: 'caption',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.startElement?.type === ElementType.IMAGE &&
          !!payload.startElement?.imgCaption
        )
      },
      callback: (command: Command, context) => {
        const currentCaption = context.startElement?.imgCaption
        new Dialog({
          title: 'Sửa chú thích',
          data: [
            {
              type: 'text',
              label: 'Nội dung chú thích',
              name: 'value',
              required: true,
              value: currentCaption?.value,
              placeholder: 'Vui lòng nhập nội dung chú thích, dùng {imageNo} cho số thứ tự hình ảnh'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            command.executeSetImageCaption({
              ...currentCaption,
              value: value || ''
            })
          }
        })
      }
    },
    {
      name: 'Chữ ký',
      icon: 'signature',
      when: payload => {
        return !payload.isReadonly && payload.editorTextFocus
      },
      callback: (command: Command) => {
        new Signature({
          onConfirm(payload) {
            if (!payload) return
            const { value, width, height } = payload
            if (!value || !width || !height) return
            command.executeInsertElementList([
              {
                value,
                width,
                height,
                type: ElementType.IMAGE
              }
            ])
          }
        })
      }
    },
    {
      name: 'Định dạng chuẩn',
      icon: 'word-tool',
      when: payload => {
        return !payload.isReadonly
      },
      callback: (command: Command) => {
        command.executeWordTool()
      }
    },
    {
      name: 'Xóa nét vẽ tự do',
      when: payload => {
        return payload.options.mode === EditorMode.GRAFFITI
      },
      callback: (command: Command) => {
        command.executeClearGraffiti()
      }
    },
    {
      name: 'Macro',
      when: payload => !payload.isReadonly,
      childMenus: [
        {
          name: 'Ghi Macro',
          icon: 'record',
          when: () => !instance.macro.isRecording(),
          callback: () => {
            instance.macro.startRecording()
          }
        },
        {
          name: 'Dừng ghi Macro',
          icon: 'stop',
          when: () => instance.macro.isRecording(),
          callback: () => {
            new Dialog({
              title: 'Lưu Macro',
              data: [
                {
                  type: 'text',
                  label: 'Tên Macro',
                  name: 'name',
                  required: true,
                  placeholder: 'Nhập tên Macro'
                }
              ],
              onConfirm: payload => {
                const name = payload.find(p => p.name === 'name')?.value
                if (!name) return
                const macro = instance.macro.stopRecording(name)
                if (!macro) return
                localStorage.setItem(
                  MACRO_STORAGE_KEY,
                  instance.macro.exportMacros()
                )
              },
              onCancel: () => {
                instance.macro.cancelRecording()
              }
            })
          }
        },
        {
          name: 'Phát lại Macro',
          when: () =>
            !instance.macro.isRecording() &&
            instance.macro.getMacros().length > 0,
          callback: () => {
            const macros = instance.macro.getMacros()
            new Dialog({
              title: 'Phát lại Macro',
              data: [
                {
                  type: 'select',
                  label: 'Chọn Macro',
                  name: 'macroId',
                  required: true,
                  options: macros.map(m => ({
                    label: `${m.name} (${m.type})`,
                    value: m.id
                  }))
                }
              ],
              onConfirm: async payload => {
                const id = payload.find(p => p.name === 'macroId')?.value
                if (!id) return
                await instance.macro.play(id)
              }
            })
          }
        },
        {
          name: 'Quản lý Macro',
          when: () =>
            !instance.macro.isRecording() &&
            instance.macro.getMacros().length > 0,
          callback: () => {
            const macros = instance.macro.getMacros()
            new Dialog({
              title: 'Quản lý Macro',
              data: [
                {
                  type: 'select',
                  label: 'Chọn Macro cần xóa',
                  name: 'macroId',
                  options: macros.map(m => ({
                    label: `${m.name} (${m.type})`,
                    value: m.id
                  }))
                }
              ],
              onConfirm: payload => {
                const id = payload.find(p => p.name === 'macroId')?.value
                if (!id) return
                if (instance.macro.removeMacro(id)) {
                  localStorage.setItem(
                    MACRO_STORAGE_KEY,
                    instance.macro.exportMacros()
                  )
                }
              }
            })
          }
        }
      ]
    }
  ])

  // 10. Đăng ký phím tắt
  instance.register.shortcutList([
    {
      key: KeyMap.P,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePrint()
      }
    },
    {
      key: KeyMap.F,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        const text = command.getRangeText()
        if (text) {
          instance.command.executeSearch(text)
        }
      }
    },
    {
      key: KeyMap.MINUS,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleMinus()
      }
    },
    {
      key: KeyMap.EQUAL,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleAdd()
      }
    },
    {
      key: KeyMap.ZERO,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleRecovery()
      }
    }
  ])
}

<template>
  <div class="word-editor-app" :class="{ 'is-fullscreen': isFullscreen }" :style="{ height: props.height }">
    <!-- 1. Tier 1: Docs Menubar & Document Info (Google Docs / Word Web Style) -->
    <header class="docs-header">
      <div class="docs-header-left">
        <div class="docs-logo" title="Kindy Docs">
          <span class="docs-logo-letter">W</span>
        </div>

        <div class="docs-info-and-menu">
          <!-- Document Name & Auto-save Status -->
          <div class="docs-title-row">
            <input
              v-model="documentTitle"
              type="text"
              class="docs-title-input"
              placeholder="Tài liệu không có tiêu đề"
            />
            <span class="docs-cloud-status" :title="isSaved ? 'Đã lưu vào bộ nhớ' : 'Đang lưu...'">
              <span class="status-dot" :class="{ saved: isSaved }"></span>
              {{ isSaved ? 'Đã lưu vào bộ nhớ' : 'Đang lưu...' }}
            </span>
          </div>

          <!-- Text Menubar (Tệp, Chỉnh sửa, Xem, Chèn, Định dạng, Công cụ, Trợ giúp) -->
          <div class="docs-menubar">
            <!-- Tệp Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'file' }" @click.stop="toggleMenuDropdown('file')">
                Tệp
              </button>
              <div v-if="openMenuName === 'file'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="triggerNewDoc(); closeMenu()">
                  <WordIcon name="file" :size="14" />
                  <span>Tạo mới (Ctrl+N)</span>
                </div>
                <div class="menu-item" @click="triggerOpenDoc(); closeMenu()">
                  <WordIcon name="file" :size="14" />
                  <span>Mở tệp (.docx, .json)</span>
                </div>
                <div class="menu-item" @click="triggerSave(); closeMenu()">
                  <WordIcon name="save" :size="14" />
                  <span>Lưu tài liệu (Ctrl+S)</span>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="triggerExportDocx(); closeMenu()">
                  <WordIcon name="copy" :size="14" />
                  <span>Tải xuống (.docx)</span>
                </div>
                <div class="menu-item" @click="triggerPrint(); closeMenu()">
                  <WordIcon name="print" :size="14" />
                  <span>In ấn (Ctrl+P)</span>
                </div>
              </div>
            </div>

            <!-- Chỉnh sửa Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'edit' }" @click.stop="toggleMenuDropdown('edit')">
                Chỉnh sửa
              </button>
              <div v-if="openMenuName === 'edit'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="executeUndo(); closeMenu()"><span>Hoàn tác (Ctrl+Z)</span></div>
                <div class="menu-item" @click="executeRedo(); closeMenu()"><span>Làm lại (Ctrl+Y)</span></div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="executeCut(); closeMenu()"><span>Cắt (Ctrl+X)</span></div>
                <div class="menu-item" @click="executeCopy(); closeMenu()"><span>Sao chép (Ctrl+C)</span></div>
                <div class="menu-item" @click="executePaste(); closeMenu()"><span>Dán (Ctrl+V)</span></div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="openSearch(); closeMenu()"><span>Tìm kiếm & Thay thế (Ctrl+F)</span></div>
              </div>
            </div>

            <!-- Xem Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'view' }" @click.stop="toggleMenuDropdown('view')">
                Xem
              </button>
              <div v-if="openMenuName === 'view'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="toggleRuler(); closeMenu()"><span>Bật/tắt thước kẻ</span></div>
                <div class="menu-item" @click="showCatalog = !showCatalog; closeMenu()"><span>Mục lục tài liệu</span></div>
                <div class="menu-item" @click="showCommentsSidebar = !showCommentsSidebar; closeMenu()"><span>Danh sách nhận xét</span></div>
                <div class="menu-item" @click="toggleFullscreen(); closeMenu()"><span>Toàn màn hình</span></div>
              </div>
            </div>

            <!-- Chèn Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'insert' }" @click.stop="toggleMenuDropdown('insert')">
                Chèn
              </button>
              <div v-if="openMenuName === 'insert'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="triggerImageUpload(); closeMenu()"><span>Hình ảnh</span></div>
                <div class="menu-item" @click="showTableModal = true; closeMenu()"><span>Bảng biểu</span></div>
                <div class="menu-item" @click="insertPageBreak(); closeMenu()"><span>Ngắt trang</span></div>
                <div class="menu-item" @click="insertDivider(); closeMenu()"><span>Đường phân cách</span></div>
                <div class="menu-item" @click="insertHyperlink(); closeMenu()"><span>Đường liên kết</span></div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="handleAddComment(); closeMenu()"><span>Nhận xét / Bình luận</span></div>
              </div>
            </div>

            <!-- Định dạng Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'format' }" @click.stop="toggleMenuDropdown('format')">
                Định dạng
              </button>
              <div v-if="openMenuName === 'format'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="toggleBold(); closeMenu()"><span>Đậm (Ctrl+B)</span></div>
                <div class="menu-item" @click="toggleItalic(); closeMenu()"><span>Nghiêng (Ctrl+I)</span></div>
                <div class="menu-item" @click="toggleUnderline(); closeMenu()"><span>Gạch chân (Ctrl+U)</span></div>
                <div class="menu-item" @click="toggleStrikeout(); closeMenu()"><span>Gạch ngang</span></div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="executeClearFormat(); closeMenu()"><span>Xóa định dạng</span></div>
                <div class="menu-item" @click="executeWordTool(); closeMenu()"><span>Chuẩn hóa kiểu văn phòng</span></div>
              </div>
            </div>

            <!-- Bố cục Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'layout' }" @click.stop="toggleMenuDropdown('layout')">
                Bố cục
              </button>
              <div v-if="openMenuName === 'layout'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="setPaperDirection('vertical'); closeMenu()"><span>Khổ dọc (Portrait)</span></div>
                <div class="menu-item" @click="setPaperDirection('horizontal'); closeMenu()"><span>Khổ ngang (Landscape)</span></div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="setStandardMargin(); closeMenu()"><span>Lề tiêu chuẩn (2cm)</span></div>
                <div class="menu-item" @click="setNarrowMargin(); closeMenu()"><span>Lề hẹp (1.27cm)</span></div>
                <div class="menu-item" @click="addWatermark(); closeMenu()"><span>Watermark chìm</span></div>
                <div class="menu-divider"></div>
                <div class="menu-item" @click="editHeader(); closeMenu()"><span>Sửa đầu trang (Header)</span></div>
                <div class="menu-item" @click="editFooter(); closeMenu()"><span>Sửa chân trang (Footer)</span></div>
              </div>
            </div>

            <!-- Công cụ Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'tools' }" @click.stop="toggleMenuDropdown('tools')">
                Công cụ
              </button>
              <div v-if="openMenuName === 'tools'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="showWordCountInfo(); closeMenu()"><span>Đếm số từ</span></div>
                <div class="menu-item" @click="toggleReadOnlyMode(); closeMenu()"><span>{{ editorMode === 'readonly' ? 'Mở khóa sửa' : 'Khóa chỉ đọc' }}</span></div>
              </div>
            </div>

            <!-- Trợ giúp Menu -->
            <div class="menu-dropdown-wrapper">
              <button class="menu-tab-btn" :class="{ active: openMenuName === 'help' }" @click.stop="toggleMenuDropdown('help')">
                Trợ giúp
              </button>
              <div v-if="openMenuName === 'help'" class="docs-dropdown-panel" @click.stop>
                <div class="menu-item" @click="showShortcutsModal(); closeMenu()"><span>Phím tắt</span></div>
                <div class="menu-item" @click="showAboutModal(); closeMenu()"><span>Về phần mềm</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Comments, Share, Avatar -->
      <div class="docs-header-right">
        <button
          class="docs-btn-comments"
          :class="{ active: showCommentsSidebar }"
          title="Xem nhận xét"
          @click="showCommentsSidebar = !showCommentsSidebar"
        >
          <WordIcon name="comment" :size="15" />
          <span>Bình luận</span>
          <span v-if="comments.length" class="comment-counter">{{ comments.length }}</span>
        </button>

        <button class="docs-btn-share" title="Tải xuống hoặc chia sẻ tài liệu" @click="triggerExportDocx">
          <WordIcon name="copy" :size="13" />
          <span>Chia sẻ</span>
        </button>

        <div class="docs-avatar-badge" title="Tài khoản Kindy">
          <span>K</span>
        </div>
      </div>
    </header>

    <!-- 2. Tier 2: Single-Row Unified Toolbar (Google Docs / Word Web Style) -->
    <div class="docs-toolbar">
      <!-- Undo, Redo, Print, Painter -->
      <button class="tb-btn" title="Hoàn tác (Ctrl+Z)" @click="executeUndo">
        <WordIcon name="undo" :size="14" />
      </button>
      <button class="tb-btn" title="Làm lại (Ctrl+Y)" @click="executeRedo">
        <WordIcon name="redo" :size="14" />
      </button>
      <button class="tb-btn" title="In ấn (Ctrl+P)" @click="triggerPrint">
        <WordIcon name="print" :size="14" />
      </button>
      <button class="tb-btn" title="Sao chép định dạng" @click="executeFormatPainter">
        <WordIcon name="painter" :size="14" />
      </button>

      <span class="tb-divider"></span>

      <!-- Zoom Level Dropdown -->
      <select v-model="zoomScale" class="tb-select tb-zoom-select" @change="editor?.command.executePageScale(zoomScale)">
        <option :value="0.5">50%</option>
        <option :value="0.75">75%</option>
        <option :value="1.0">100%</option>
        <option :value="1.25">125%</option>
        <option :value="1.5">150%</option>
        <option :value="2.0">200%</option>
      </select>

      <span class="tb-divider"></span>

      <!-- Style Dropdown (Heading / Title) -->
      <select class="tb-select tb-style-select" @change="onStyleChange($event)">
        <option value="normal">Văn bản thường</option>
        <option value="first">Tiêu đề 1</option>
        <option value="second">Tiêu đề 2</option>
        <option value="third">Tiêu đề 3</option>
      </select>

      <!-- Font Family Dropdown -->
      <select v-model="currentFont" class="tb-select tb-font-select" @change="changeFont">
        <option value="Times New Roman">Times New Roman</option>
        <option value="Arial">Arial</option>
        <option value="Segoe UI">Segoe UI</option>
        <option value="Calibri">Calibri</option>
        <option value="Roboto">Roboto</option>
        <option value="Courier New">Courier New</option>
      </select>

      <!-- Font Size Dropdown -->
      <select v-model="currentSize" class="tb-select tb-size-select" @change="changeSize">
        <option :value="9">9 pt</option>
        <option :value="10.5">10.5 pt</option>
        <option :value="12">12 pt</option>
        <option :value="14">14 pt</option>
        <option :value="15">15 pt</option>
        <option :value="16">16 pt</option>
        <option :value="18">18 pt</option>
        <option :value="24">24 pt</option>
        <option :value="36">36 pt</option>
      </select>

      <span class="tb-divider"></span>

      <!-- Basic Formatting: Bold, Italic, Underline, Strikeout -->
      <button class="tb-btn" :class="{ active: isBold }" title="Đậm (Ctrl+B)" @click="toggleBold">
        <WordIcon name="bold" :size="14" />
      </button>
      <button class="tb-btn" :class="{ active: isItalic }" title="Nghiêng (Ctrl+I)" @click="toggleItalic">
        <WordIcon name="italic" :size="14" />
      </button>
      <button class="tb-btn" :class="{ active: isUnderline }" title="Gạch chân (Ctrl+U)" @click="toggleUnderline">
        <WordIcon name="underline" :size="14" />
      </button>
      <button class="tb-btn" :class="{ active: isStrikeout }" title="Gạch ngang" @click="toggleStrikeout">
        <WordIcon name="strikeout" :size="14" />
      </button>

      <!-- Colors -->
      <label class="tb-color-picker" title="Màu chữ">
        <span class="color-text-icon" :style="{ borderBottomColor: fontColor }">A</span>
        <input type="color" v-model="fontColor" @change="changeColor" style="display: none;" />
      </label>
      <label class="tb-color-picker" title="Màu nền highlight">
        <span class="color-highlight-icon" :style="{ backgroundColor: highlightColor }">ab</span>
        <input type="color" v-model="highlightColor" @change="changeHighlight" style="display: none;" />
      </label>

      <span class="tb-divider"></span>

      <!-- Insert Tools: Link, Comment, Image, Table -->
      <button class="tb-btn" title="Chèn liên kết (Ctrl+K)" @click="insertHyperlink">
        <WordIcon name="link" :size="14" />
      </button>
      <button class="tb-btn" title="Thêm nhận xét/bình luận" @click="handleAddComment">
        <WordIcon name="comment" :size="14" />
      </button>
      <button class="tb-btn" title="Chèn hình ảnh" @click="triggerImageUpload">
        <WordIcon name="image" :size="14" />
      </button>
      <button class="tb-btn" title="Chèn bảng biểu" @click="showTableModal = true">
        <WordIcon name="table" :size="14" />
      </button>

      <span class="tb-divider"></span>

      <!-- Alignments -->
      <button class="tb-btn" :class="{ active: alignMode === 'left' }" title="Căn trái (Ctrl+L)" @click="setAlign('left')">
        <WordIcon name="align-left" :size="14" />
      </button>
      <button class="tb-btn" :class="{ active: alignMode === 'center' }" title="Căn giữa (Ctrl+E)" @click="setAlign('center')">
        <WordIcon name="align-center" :size="14" />
      </button>
      <button class="tb-btn" :class="{ active: alignMode === 'right' }" title="Căn phải (Ctrl+R)" @click="setAlign('right')">
        <WordIcon name="align-right" :size="14" />
      </button>
      <button class="tb-btn" :class="{ active: alignMode === 'alignment' }" title="Căn đều 2 bên (Ctrl+J)" @click="setAlign('alignment')">
        <WordIcon name="align-justify" :size="14" />
      </button>

      <!-- Line Spacing -->
      <select v-model="currentLineSpacing" class="tb-select tb-spacing-select" title="Giãn dòng" @change="changeLineSpacing">
        <option :value="1">1.0</option>
        <option :value="1.15">1.15</option>
        <option :value="1.25">1.25</option>
        <option :value="1.5">1.5</option>
        <option :value="2.0">2.0</option>
      </select>

      <span class="tb-divider"></span>

      <!-- Lists & Indent -->
      <button class="tb-btn" title="Danh sách dấu chấm" @click="executeBulletList">
        <WordIcon name="list-bullet" :size="14" />
      </button>
      <button class="tb-btn" title="Danh sách đánh số" @click="executeOrderedList">
        <WordIcon name="list-ordered" :size="14" />
      </button>
      <button class="tb-btn" title="Giảm thụt lề" @click="executeOutdent">
        <WordIcon name="outdent" :size="14" />
      </button>
      <button class="tb-btn" title="Tăng thụt lề" @click="executeIndent">
        <WordIcon name="indent" :size="14" />
      </button>

      <span class="tb-divider"></span>

      <!-- Form Controls, Break, Format Tools -->
      <button class="tb-btn" title="Hộp kiểm (Checkbox)" @click="insertCheckbox">
        <WordIcon name="checkbox" :size="14" />
      </button>
      <button class="tb-btn" title="Ngắt trang" @click="insertPageBreak">
        <WordIcon name="page-break" :size="14" />
      </button>
      <button class="tb-btn text-clear-btn" title="Xóa định dạng" @click="executeClearFormat">
        Aa⌫
      </button>
    </div>

    <div v-if="ioNotice" class="document-io-notice" :class="`is-${ioNotice.tone}`" role="status">
      <span>{{ ioNotice.text }}</span>
      <button type="button" aria-label="Đóng thông báo" @click="ioNotice = null">✕</button>
    </div>

    <!-- Hidden file inputs -->
    <input ref="fileInputRef" type="file" style="display: none" accept=".docx,.json" @change="onFileSelected" />
    <input ref="imageInputRef" type="file" style="display: none" accept="image/*" @change="onImageSelected" />

    <!-- 3. Main Workspace: Catalog Sidebar + Canvas Editor Host + Comments Sidebar -->
    <main class="word-workspace">
      <!-- Outline / Catalog Sidebar -->
      <aside v-if="showCatalog" class="catalog-sidebar">
        <div class="catalog-header">
          <div class="catalog-title">
            <WordIcon name="catalog" :size="14" />
            <span>Mục lục tài liệu</span>
          </div>
          <button class="close-btn" @click="showCatalog = false">✕</button>
        </div>
        <div class="catalog-list">
          <div v-if="catalogItems.length === 0" class="catalog-empty">Không có tiêu đề nào</div>
          <div
            v-for="(item, idx) in catalogItems"
            :key="idx"
            class="catalog-item"
            :style="{ paddingLeft: `${(item.level || 0) * 16 + 8}px` }"
            @click="jumpToCatalog(item)"
          >
            {{ item.name }}
          </div>
        </div>
      </aside>

      <!-- Canvas Editor Host Area -->
      <div class="canvas-scroll-container">
        <div ref="canvasHostRef" class="canvas-host"></div>
      </div>

      <!-- Comments / Annotations Sidebar -->
      <aside v-if="showCommentsSidebar" class="comments-sidebar">
        <div class="comments-header">
          <div class="comments-title">
            <WordIcon name="comment" :size="14" />
            <span>Bình luận ({{ comments.length }})</span>
          </div>
          <div class="comments-header-actions">
            <button class="btn-add-comment-quick" title="Thêm bình luận" @click="handleAddComment">＋ Thêm</button>
            <button class="close-btn" @click="showCommentsSidebar = false">✕</button>
          </div>
        </div>

        <div class="comments-list">
          <!-- Active Draft Comment Card -->
          <div v-if="draftComment" class="comment-card draft-card">
            <div class="comment-card-header">
              <div class="comment-author">
                <span class="avatar">{{ draftComment.avatar }}</span>
                <span class="name">{{ draftComment.author }}</span>
              </div>
            </div>
            <textarea
              ref="draftInputRef"
              v-model="draftComment.content"
              class="comment-textarea"
              placeholder="Nhập nội dung nhận xét..."
              rows="3"
            ></textarea>
            <div class="comment-card-footer">
              <button class="btn-comment-action cancel" @click="cancelDraftComment">Hủy</button>
              <button
                class="btn-comment-action submit"
                :disabled="!draftComment.content.trim()"
                @click="submitDraftComment"
              >
                Lưu nhận xét
              </button>
            </div>
          </div>

          <!-- Empty Comments state -->
          <div v-if="comments.length === 0 && !draftComment" class="comments-empty">
            <div style="font-size: 24px; margin-bottom: 6px;">💬</div>
            <div style="font-weight: 500;">Chưa có bình luận nào</div>
            <div class="comments-empty-tip">Bôi đen văn bản trên trang và nhấn nút <strong>"Bình luận"</strong> để nhận xét.</div>
          </div>

          <!-- Existing Comments List -->
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="comment-card"
            :class="{ active: activeCommentId === comment.id, resolved: comment.resolved }"
            @click="focusComment(comment)"
          >
            <div class="comment-card-header">
              <div class="comment-author">
                <span class="avatar">{{ comment.avatar || '👤' }}</span>
                <div>
                  <div class="name">{{ comment.author }}</div>
                  <div class="time">{{ comment.createdAt }}</div>
                </div>
              </div>
              <div class="comment-menu">
                <button
                  class="comment-icon-btn"
                  :title="comment.resolved ? 'Mở lại bình luận' : 'Đánh dấu đã giải quyết'"
                  @click.stop="toggleResolveComment(comment)"
                >
                  {{ comment.resolved ? '↩' : '✓' }}
                </button>
                <button class="comment-icon-btn delete" title="Xóa bình luận này" @click.stop="deleteComment(comment)">
                  ✕
                </button>
              </div>
            </div>

            <div class="comment-body">
              {{ comment.content }}
            </div>

            <!-- Replies List -->
            <div v-if="comment.replies && comment.replies.length > 0" class="replies-container">
              <div v-for="(reply, rIdx) in comment.replies" :key="rIdx" class="reply-card">
                <div class="reply-header">
                  <strong>{{ reply.author }}</strong>
                  <span class="time">{{ reply.createdAt }}</span>
                </div>
                <div class="reply-content">{{ reply.content }}</div>
              </div>
            </div>

            <!-- Reply Input Box -->
            <div class="reply-input-wrapper" @click.stop>
              <input
                v-model="commentReplyInputs[comment.id]"
                type="text"
                class="reply-input"
                placeholder="Phản hồi bình luận..."
                @keydown.enter="addReply(comment)"
              />
              <button
                v-if="commentReplyInputs[comment.id]?.trim()"
                class="reply-send-btn"
                @click="addReply(comment)"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- 4. Bottom Status Bar (Chuẩn Word 365) -->
    <footer class="word-statusbar">
      <div class="statusbar-left">
        <button class="status-btn" title="Bật/tắt mục lục" @click="showCatalog = !showCatalog">
          <WordIcon name="catalog" :size="13" />
        </button>
        <button
          class="status-btn"
          :class="{ active: showCommentsSidebar }"
          title="Bật/tắt danh sách bình luận"
          @click="showCommentsSidebar = !showCommentsSidebar"
        >
          <WordIcon name="comment" :size="13" />
          <span v-if="comments.length" class="comment-status-badge">{{ comments.length }}</span>
        </button>
        <span class="status-divider">|</span>
        <span class="status-text">Trang: <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
        <span class="status-divider">|</span>
        <span class="status-text">Số từ: <strong>{{ wordCount }}</strong></span>
      </div>

      <div class="statusbar-center">
        <select v-model="editorMode" class="mode-select" @change="changeEditorMode">
          <option value="edit">✎ Chế độ chỉnh sửa</option>
          <option value="readonly">👁️ Chế độ chỉ đọc</option>
          <option value="form">📋 Chế độ điền biểu mẫu (Form)</option>
        </select>
      </div>

      <div class="statusbar-right">
        <button class="zoom-btn" title="Thu nhỏ" @click="zoomOut">-</button>
        <span class="zoom-text">{{ Math.round(zoomScale * 100) }}%</span>
        <button class="zoom-btn" title="Phóng to" @click="zoomIn">+</button>
        <span class="status-divider">|</span>
        <button class="status-btn" title="Phóng to toàn màn hình" @click="toggleFullscreen">
          <WordIcon name="fullscreen" :size="13" />
        </button>
      </div>
    </footer>

    <!-- Table Modal -->
    <div v-if="showTableModal" class="word-modal-overlay" @click="showTableModal = false">
      <div class="word-modal" @click.stop>
        <div class="modal-header">
          <h3>Chèn Bảng Biểu</h3>
          <button class="close-btn" @click="showTableModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>Số hàng:</label>
            <input v-model.number="tableRows" type="number" min="1" max="50" />
          </div>
          <div class="form-row">
            <label>Số cột:</label>
            <input v-model.number="tableCols" type="number" min="1" max="20" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel-btn" @click="showTableModal = false">Hủy</button>
          <button class="modal-ok-btn" @click="confirmInsertTable">Chèn bảng</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JSONContent } from '@tiptap/core'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import WordIcon from './WordIcon.vue'
import CanvasEditor, { EditorMode, EditorZone, PaperDirection, ElementType, TitleLevel } from '../../engines/canvas/core'
import { createCanvasEngineAdapter, type CanvasEngineHandle } from '../../engines/canvas'
import { importDocx, exportDocx } from '../../codecs/docx'
import { createEmptyDocumentState } from '../../core/state'
import type { CompatibilityReport, KindyDocumentState, KindyHeaderFooterState, KindyPageState } from '../../core/types'

defineOptions({ name: 'KindyEditor' })

export interface CommentItem {
  id: string
  author: string
  userId?: string
  color?: string
  avatar?: string
  content: string
  createdAt: string
  createdAtValue?: number
  resolved: boolean
  resolvedAt?: number | null
  replies: Array<{
    id?: string
    author: string
    userId?: string
    content: string
    createdAt: string
    createdAtValue?: number
  }>
}

const props = withDefaults(defineProps<{
  initialData?: Record<string, unknown>
  document?: { content?: JSONContent; readOnly?: boolean; title?: string }
  page?: Record<string, any>
  dicts?: Record<string, any>
  locale?: string
  docxProfile?: CompatibilityReport['profile']
  height?: string
  onSave?: () => unknown
}>(), {
  locale: 'vi-VN',
  docxProfile: 'kindy-docx-v2.2',
  height: '100%',
  document: () => ({}),
  page: () => ({}),
  dicts: () => ({}),
})

const emits = defineEmits([
  'beforeCreate', 'created', 'change', 'changed', 'save', 'saved',
  'changed:locale', 'changed:pageLayout', 'changed:pageSize',
  'changed:pageOrientation', 'changed:pageMargin', 'changed:pageZoom',
  'print', 'focus', 'blur', 'destroy', 'imported', 'compatibility-warning', 'error',
])

// UI States
const activeTab = ref('home')
const isRibbonCollapsed = ref(false)
const showMenuDropdown = ref(false)
const openMenuName = ref<string | null>(null)
const toggleMenuDropdown = (name: string) => {
  openMenuName.value = openMenuName.value === name ? null : name
}
const closeMenu = () => {
  openMenuName.value = null
}
const showCatalog = ref(false)
const showCommentsSidebar = ref(false)
const showTableModal = ref(false)
const isFullscreen = ref(false)
const activeZone = ref<'main' | 'header' | 'footer'>('main')

const onStyleChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  if (val === 'normal') applyTitle(null)
  else applyTitle(val as any)
}

// Title & Search States
const documentTitle = ref('Tài liệu hợp đồng kinh tế.docx')
const isSaved = ref(true)
const searchQuery = ref('')
const ioNotice = ref<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null)

// Comments States
const comments = ref<CommentItem[]>([])
const activeCommentId = ref<string | null>(null)
const draftComment = ref<CommentItem | null>(null)
const draftInputRef = ref<HTMLTextAreaElement | null>(null)
const commentReplyInputs = ref<Record<string, string>>({})

const tabs = [
  { id: 'home', label: 'Trang đầu' },
  { id: 'insert', label: 'Chèn' },
  { id: 'layout', label: 'Bố cục' },
  { id: 'review', label: 'Đánh giá' },
  { id: 'view', label: 'Xem' },
  { id: 'help', label: 'Trợ giúp' }
]

// Formatting States
const currentFont = ref('Times New Roman')
const currentSize = ref(12)
const currentLineSpacing = ref(1.25)
const isBold = ref(false)
const isItalic = ref(false)
const isUnderline = ref(false)
const isStrikeout = ref(false)
const fontColor = ref('#000000')
const highlightColor = ref('#ffff00')
const alignMode = ref('left')

// Status Bar States
const currentPage = ref(1)
const totalPages = ref(1)
const wordCount = ref(0)
const zoomScale = ref(1.0)
const editorMode = ref('edit')
const catalogItems = ref<Array<{ name: string; level?: number }>>([])

// Table input states
const tableRows = ref(3)
const tableCols = ref(4)

// DOM refs
const canvasHostRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
let editor: CanvasEditor | null = null
let engineHandle: CanvasEngineHandle | null = null
let offEngineChange: (() => void) | null = null
let currentState = createEmptyDocumentState()
let contentSaved = true

const displayTimestamp = (value: unknown) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ''
  return new Date(timestamp).toLocaleString(props.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const walkContent = (node: JSONContent, visitor: (value: JSONContent) => void) => {
  visitor(node)
  node.content?.forEach((child) => walkContent(child, visitor))
}

const syncCommentsFromState = (state: KindyDocumentState) => {
  const imported = new Map<string, CommentItem>()
  walkContent(state.content, (node) => {
    for (const mark of node.marks || []) {
      if (mark.type !== 'comment') continue
      let thread: Record<string, any>
      try {
        thread = JSON.parse(String(mark.attrs?.thread || ''))
      } catch {
        continue
      }
      if (!thread || typeof thread !== 'object' || !thread.text) continue
      const id = String(thread.id || mark.attrs?.id || '')
      if (!id || imported.has(id)) continue
      const createdAtValue = Number(thread.createdAt) || undefined
      imported.set(id, {
        id,
        author: String(thread.user || mark.attrs?.user || 'Không rõ người gửi'),
        userId: String(thread.userId || ''),
        color: String(thread.color || mark.attrs?.color || 'rgba(255, 213, 79, 0.4)'),
        avatar: '👤',
        content: String(thread.text),
        createdAt: displayTimestamp(createdAtValue),
        createdAtValue,
        resolved: Boolean(thread.resolved),
        resolvedAt: Number(thread.resolvedAt) || null,
        replies: (Array.isArray(thread.replies) ? thread.replies : []).map((reply: Record<string, any>) => {
          const replyCreatedAt = Number(reply.createdAt) || undefined
          return {
            id: String(reply.id || ''),
            author: String(reply.user || 'Không rõ người gửi'),
            userId: String(reply.userId || ''),
            content: String(reply.text || ''),
            createdAt: displayTimestamp(replyCreatedAt),
            createdAtValue: replyCreatedAt,
          }
        }),
      })
    }
  })
  comments.value = [...imported.values()]
}

const commentThread = (comment: CommentItem) => ({
  id: comment.id,
  user: comment.author,
  userId: comment.userId || '',
  color: comment.color || 'rgba(255, 213, 79, 0.4)',
  text: comment.content,
  replies: comment.replies.map((reply) => ({
    id: reply.id || `reply-${comment.id}-${reply.createdAtValue || Date.now()}`,
    user: reply.author,
    userId: reply.userId || '',
    text: reply.content,
    createdAt: reply.createdAtValue || Date.now(),
  })),
  resolved: comment.resolved,
  createdAt: comment.createdAtValue || Date.now(),
  resolvedAt: comment.resolved ? (comment.resolvedAt || Date.now()) : null,
})

const persistCommentMetadata = (comment: CommentItem) => {
  if (!engineHandle) return
  const state = engineHandle.getState()
  const thread = commentThread(comment)
  const update = (node: JSONContent): JSONContent => ({
    ...node,
    marks: node.marks?.map((mark) => (
      mark.type === 'comment' && String(mark.attrs?.id || '') === comment.id
        ? {
            type: 'comment',
            attrs: {
              id: comment.id,
              user: comment.author,
              color: thread.color,
              thread: JSON.stringify(thread),
            },
          }
        : mark
    )),
    content: node.content?.map(update),
  })
  currentState = createEmptyDocumentState({ ...state, content: update(state.content) })
  engineHandle.load(currentState)
  contentSaved = false
  emits('change', currentState)
  emits('changed', currentState)
}

const normalizeLocale = (locale: string) => locale.toLowerCase().startsWith('vi') ? 'vi' : 'en'

const headerFooterState = (value?: Record<string, any>): KindyHeaderFooterState => ({
  enabled: Boolean(value?.enabled ?? value?.enable),
  content: value?.content,
  text: value?.text || '',
  firstContent: value?.firstContent || value?.variants?.first?.content,
  firstText: value?.firstText || value?.variants?.first?.text,
  evenContent: value?.evenContent || value?.variants?.even?.content,
  evenText: value?.evenText || value?.variants?.even?.text,
  differentFirstPage: Boolean(value?.differentFirstPage),
  differentOddEven: Boolean(value?.differentOddEven),
})

const initialPageState = (): KindyPageState => {
  const defaults = createEmptyDocumentState().page
  const selectedSize = (props.dicts?.pageSizes || []).find((item: Record<string, unknown>) => item.default)
  const directSize = props.page?.size
  return {
    ...defaults,
    size: {
      width: Number(directSize?.width || selectedSize?.width) || defaults.size.width,
      height: Number(directSize?.height || selectedSize?.height) || defaults.size.height,
    },
    orientation: props.page?.orientation || props.page?.defaultOrientation || defaults.orientation,
    margin: {
      ...defaults.margin,
      ...(props.page?.margin || props.page?.defaultMargin || {}),
    },
    background: props.page?.background || props.page?.defaultBackground || defaults.background,
    header: headerFooterState(props.page?.header),
    footer: headerFooterState(props.page?.footer),
    sections: props.page?.sections || [],
  }
}

onMounted(() => {
  if (!canvasHostRef.value) return
  emits('beforeCreate')

  // Sample contract data by default if none provided
  const defaultSampleData: any = {
    header: [
      { value: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN DAT\n', bold: true, size: 14, rowFlex: 'right' }
    ],
    main: [
      { value: 'HỢP ĐỒNG MUA BÁN\n', bold: true, size: 24, rowFlex: 'center' },
      { value: 'Số: HDMB/DAT-2026/04\n\n', size: 16, rowFlex: 'center' },
      { value: '- Căn cứ Bộ Luật Dân Sự số 91/2015/QH13;\n', italic: true, size: 14 },
      { value: '- Căn cứ Luật Thương Mại số 36/2005/QH11;\n', italic: true, size: 14 },
      { value: '- Căn cứ vào nhu cầu và khả năng của hai bên.\n\n', italic: true, size: 14 },
      { value: 'Hôm nay, ngày 14 tháng 04 năm 2026, chúng tôi gồm có:\n\n', size: 16 },
      { value: 'BÊN A (BÊN MUA):\n', bold: true, size: 16 },
      { value: '- Đại diện: Ông ', size: 16 },
      {
        type: ElementType.CONTROL,
        value: '',
        control: {
          type: 'text' as any,
          value: [{ value: 'Nguyễn Văn A' }],
          placeholder: 'Nhập họ tên đại diện'
        }
      },
      { value: '    Chức vụ: ', size: 16 },
      {
        type: ElementType.CONTROL,
        value: '',
        control: {
          type: 'text' as any,
          value: [{ value: 'Giám Đốc' }],
          placeholder: 'Nhập chức vụ'
        }
      },
      { value: '\n- Địa chỉ: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh\n\n', size: 16 },
      { value: 'BÊN B (BÊN BÁN): CÔNG TY CỔ PHẦN TẬP ĐOÀN DAT\n', bold: true, size: 16, highlight: '#fef08a' },
      { value: '- Đại diện: Ông LÊ QUỐC ANH    Chức vụ: Phó Tổng Giám Đốc\n', size: 16 },
      { value: '- Địa chỉ: 12 Đồng Hưng Thuận 10, P. Đông Hưng Thuận, TP. Hồ Chí Minh\n\n', size: 16 }
    ],
    footer: []
  }

  currentState = createEmptyDocumentState({
    content: props.document?.content || createEmptyDocumentState().content,
    page: initialPageState(),
  })
  engineHandle = createCanvasEngineAdapter().mount(canvasHostRef.value, {
    document: currentState,
    locale: normalizeLocale(props.locale),
    readOnly: Boolean(props.document?.readOnly),
  })
  editor = engineHandle.getCanvasEditor()
  offEngineChange = engineHandle.onChange((state) => {
    currentState = state
    syncCommentsFromState(state)
    contentSaved = false
    emits('change', state)
    emits('changed', state)
    updateStats()
  })

  // Standalone demo/legacy callers may still provide raw CanvasEngine data.
  // DocumentLibrary always supplies canonical ProseMirror JSON instead.
  if (!props.document?.content) {
    editor.command.executeSetValue((props.initialData || defaultSampleData) as any, { isSetCursor: true })
  }
  syncCommentsFromState(currentState)

  editor.listener.rangeStyleChange = (payload) => {
    if (payload.type === 'text') {
      isBold.value = !!payload.bold
      isItalic.value = !!payload.italic
      isUnderline.value = !!payload.underline
      isStrikeout.value = !!payload.strikeout
      if (payload.font) currentFont.value = payload.font
      if (payload.size) currentSize.value = payload.size
      if (payload.rowFlex) alignMode.value = payload.rowFlex
    }
    if (payload.groupIds && payload.groupIds.length > 0) {
      activeCommentId.value = payload.groupIds[0]
    } else {
      activeCommentId.value = null
    }
  }

  editor.listener.pageSizeChange = (count) => {
    totalPages.value = Math.max(1, count)
    updateStats()
  }

  editor.listener.intersectionPageNoChange = (pageNo) => {
    currentPage.value = pageNo + 1
  }

  updateStats()
  totalPages.value = Math.max(1, canvasHostRef.value.querySelectorAll('canvas[data-index]').length)
  editorMode.value = props.document?.readOnly ? 'readonly' : 'edit'
  emits('created', { editor, engine: engineHandle })
})

let statsTimer: ReturnType<typeof setTimeout> | null = null
const updateStats = () => {
  if (!editor) return
  if (statsTimer) clearTimeout(statsTimer)
  statsTimer = setTimeout(async () => {
    if (!editor) return
    wordCount.value = Number(await Promise.resolve(editor.command.getWordCount())) || 0
  }, 250)
}

const destroyEngine = () => {
  if (statsTimer) {
    clearTimeout(statsTimer)
    statsTimer = null
  }
  offEngineChange?.()
  offEngineChange = null
  engineHandle?.destroy()
  engineHandle = null
  editor = null
}

onBeforeUnmount(() => {
  destroyEngine()
  emits('destroy')
})

// Topbar actions
const toggleMenu = () => {
  showMenuDropdown.value = !showMenuDropdown.value
}

const triggerSave = async () => {
  if (!editor) return
  const state = engineHandle?.getState() || currentState
  emits('save', state)
  const result = await props.onSave?.()
  contentSaved = true
  emits('saved', result || state)
  showMenuDropdown.value = false
}

const triggerNewDoc = () => {
  if (!editor) return
  editor.command.executeSetValue({ header: [], main: [{ value: '' }], footer: [] })
  showMenuDropdown.value = false
}

const triggerOpenDoc = () => {
  fileInputRef.value?.click()
  showMenuDropdown.value = false
}

const triggerExportDocx = async () => {
  if (!engineHandle && !editor) return
  try {
    const state = engineHandle?.getState() || currentState
    const { blob, report } = await exportDocx(state, { mode: 'strict', profile: props.docxProfile })
    if (report.issues.length) emits('compatibility-warning', report)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Tai_Lieu_Word.docx'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    ioNotice.value = { tone: 'success', text: 'Đã tạo DOCX từ trạng thái tài liệu hiện tại.' }
  } catch (err) {
    ioNotice.value = { tone: 'error', text: err instanceof Error ? err.message : 'Không thể export DOCX.' }
    emits('error', err)
  }
  showMenuDropdown.value = false
}

const triggerPrint = () => {
  if (!editor) return
  editor.command.executePrint()
  emits('print')
  showMenuDropdown.value = false
}

const openSearch = () => {
  const query = prompt('Nhập từ khóa cần tìm kiếm:')
  if (query && editor) {
    editor.command.executeSearch(query)
  }
}

const executeSearchQuery = () => {
  if (!editor || !searchQuery.value.trim()) return
  editor.command.executeSearch(searchQuery.value.trim())
}

const clearSearch = () => {
  searchQuery.value = ''
  if (editor) {
    editor.command.executeSearch('')
  }
}

const showWordCountInfo = () => {
  alert(`Thống kê tài liệu:\n- Tên tài liệu: ${documentTitle.value}\n- Tổng số từ: ${wordCount.value}\n- Tổng số trang: ${totalPages.value}`)
}

const toggleReadOnlyMode = () => {
  if (!editor) return
  if (editorMode.value === 'readonly') {
    editorMode.value = 'edit'
    editor.command.executeMode(EditorMode.EDIT)
  } else {
    editorMode.value = 'readonly'
    editor.command.executeMode(EditorMode.READONLY)
  }
}

const showShortcutsModal = () => {
  alert('Phím tắt thường dùng:\n- Ctrl + S: Lưu tài liệu\n- Ctrl + P: In ấn\n- Ctrl + Z: Hoàn tác\n- Ctrl + Y: Làm lại\n- Ctrl + B: In đậm\n- Ctrl + I: In nghiêng\n- Ctrl + U: Gạch chân\n- Ctrl + F: Tìm kiếm')
}

const showAboutModal = () => {
  alert('Kindy Word Editor 365 v2.0\nBộ soạn thảo và in ấn chuẩn 1:1 theo Microsoft Word Desktop & Google Docs trên nền tảng Canvas Engine.')
}

// Formatting Actions
const executeUndo = () => editor?.command.executeUndo()
const executeRedo = () => editor?.command.executeRedo()
const executeCut = () => editor?.command.executeCut()
const executeCopy = () => editor?.command.executeCopy()
const executePaste = () => editor?.command.executePaste()
const executeFormatPainter = () => editor?.command.executePainter({ isChecked: true })

const changeFont = () => editor?.command.executeFont(currentFont.value)
const changeSize = () => editor?.command.executeSize(Number(currentSize.value))
const executeSizeAdd = () => editor?.command.executeSizeAdd()
const executeSizeMinus = () => editor?.command.executeSizeMinus()
const executeClearFormat = () => editor?.command.executeFormat()

const toggleBold = () => {
  isBold.value = !isBold.value
  editor?.command.executeBold()
}

const toggleItalic = () => {
  isItalic.value = !isItalic.value
  editor?.command.executeItalic()
}

const toggleUnderline = () => {
  isUnderline.value = !isUnderline.value
  editor?.command.executeUnderline()
}

const toggleStrikeout = () => {
  isStrikeout.value = !isStrikeout.value
  editor?.command.executeStrikeout()
}

const toggleSuperscript = () => editor?.command.executeSuperscript()
const toggleSubscript = () => editor?.command.executeSubscript()

const changeColor = () => editor?.command.executeColor(fontColor.value)
const changeHighlight = () => editor?.command.executeHighlight(highlightColor.value)

const executeBulletList = () => editor?.command.executeList('ul' as any)
const executeOrderedList = () => editor?.command.executeList('ol' as any)
const executeIndent = () => {}
const executeOutdent = () => {}

const changeLineSpacing = () => editor?.command.executeRowMargin(Number(currentLineSpacing.value))
const setAlign = (mode: string) => {
  alignMode.value = mode
  editor?.command.executeRowFlex(mode as any)
}

const applyTitle = (level: string | null) => {
  if (!level) {
    editor?.command.executeTitle(null)
  } else {
    editor?.command.executeTitle(level as TitleLevel)
  }
}

const executeWordTool = () => editor?.command.executeWordTool()

// Insert Tab Actions
const confirmInsertTable = () => {
  if (!editor) return
  editor.command.executeInsertTable({
    rowList: [],
    rowMargin: 0,
    rowCount: Number(tableRows.value),
    colCount: Number(tableCols.value)
  })
  showTableModal.value = false
}

const triggerImageUpload = () => imageInputRef.value?.click()
const insertPageBreak = () => editor?.command.executePageBreak()
const insertDivider = () => editor?.command.executeSeparator()
const insertHyperlink = () => {
  const url = prompt('Nhập đường dẫn URL liên kết:')
  if (url && editor) {
    editor.command.executeHyperlink({ url, value: url })
  }
}

const insertTextControl = () => {
  editor?.command.executeInsertControl({
    type: 'text' as any,
    value: [{ value: '' }],
    placeholder: 'Nhập nội dung vào đây'
  })
}

const insertDateControl = () => {
  editor?.command.executeInsertControl({
    type: 'date' as any,
    value: [{ value: '2026-04-14' }]
  })
}

const insertSelectControl = () => {
  editor?.command.executeInsertControl({
    type: 'select' as any,
    value: [{ value: 'Lựa chọn 1' }],
    valueList: [{ code: '1', value: 'Lựa chọn 1' }, { code: '2', value: 'Lựa chọn 2' }]
  })
}

const insertCheckbox = () => {
  editor?.command.executeInsertElementList([{ type: ElementType.CHECKBOX, value: '' }])
}

// Layout Tab Actions
const setPaperDirection = (dir: 'vertical' | 'horizontal') => {
  editor?.command.executePaperDirection(dir === 'vertical' ? PaperDirection.VERTICAL : PaperDirection.HORIZONTAL)
}

const setStandardMargin = () => editor?.command.executeSetPaperMargin({ top: 72, bottom: 72, left: 72, right: 72 })
const setNarrowMargin = () => editor?.command.executeSetPaperMargin({ top: 36, bottom: 36, left: 36, right: 36 })
const addWatermark = () => {
  const text = prompt('Nhập chữ đóng dấu mờ (Watermark):', 'BẢN MẪU')
  if (text && editor) {
    editor.command.executeAddWatermark({ data: text, color: '#e5e7eb', size: 100 })
  }
}
const editHeader = () => {
  editor?.command.executeUpdateOptions({ header: { disabled: false, editable: true } })
  editor?.command.executeSetZone(EditorZone.HEADER)
  editor?.command.executeFocus()
  activeZone.value = 'header'
}
const editFooter = () => {
  editor?.command.executeUpdateOptions({ footer: { disabled: false, editable: true } })
  editor?.command.executeSetZone(EditorZone.FOOTER)
  editor?.command.executeFocus()
  activeZone.value = 'footer'
}

// Comments Actions
const handleAddComment = () => {
  if (!editor) return
  const groupId = editor.command.executeSetGroup()
  if (!groupId) {
    alert('Vui lòng bôi đen đoạn văn bản bạn muốn bình luận!')
    return
  }
  showCommentsSidebar.value = true
  draftComment.value = {
    id: groupId,
    author: 'Bạn (Người đánh giá)',
    userId: '',
    color: 'rgba(255, 213, 79, 0.4)',
    avatar: '✍️',
    content: '',
    createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    createdAtValue: Date.now(),
    resolved: false,
    replies: []
  }
  nextTick(() => {
    draftInputRef.value?.focus()
  })
}

const submitDraftComment = () => {
  if (!draftComment.value || !draftComment.value.content.trim()) return
  comments.value.unshift({ ...draftComment.value })
  activeCommentId.value = draftComment.value.id
  persistCommentMetadata(draftComment.value)
  draftComment.value = null
}

const cancelDraftComment = () => {
  if (draftComment.value && editor) {
    editor.command.executeDeleteGroup(draftComment.value.id)
  }
  draftComment.value = null
}

const focusComment = (comment: CommentItem) => {
  activeCommentId.value = comment.id
  if (editor) {
    editor.command.executeLocationGroup(comment.id)
  }
}

const toggleResolveComment = (comment: CommentItem) => {
  comment.resolved = !comment.resolved
  comment.resolvedAt = comment.resolved ? Date.now() : null
  persistCommentMetadata(comment)
}

const deleteComment = (comment: CommentItem) => {
  if (editor) {
    editor.command.executeDeleteGroup(comment.id)
  }
  const idx = comments.value.findIndex(c => c.id === comment.id)
  if (idx !== -1) {
    comments.value.splice(idx, 1)
  }
  if (activeCommentId.value === comment.id) {
    activeCommentId.value = null
  }
}

const addReply = (comment: CommentItem) => {
  const text = commentReplyInputs.value[comment.id]
  if (!text || !text.trim()) return
  if (!comment.replies) comment.replies = []
  comment.replies.push({
    id: `reply-${comment.id}-${Date.now()}`,
    author: 'Bạn',
    userId: '',
    content: text.trim(),
    createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    createdAtValue: Date.now(),
  })
  commentReplyInputs.value[comment.id] = ''
  persistCommentMetadata(comment)
}

// View & Statusbar Actions
const toggleRuler = () => editor?.command.executeToggleRuler()
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const zoomIn = () => {
  zoomScale.value = Math.min(2.0, zoomScale.value + 0.1)
  editor?.command.executePageScaleAdd()
}

const zoomOut = () => {
  zoomScale.value = Math.max(0.5, zoomScale.value - 0.1)
  editor?.command.executePageScaleMinus()
}

const changeEditorMode = () => {
  if (!editor) return
  if (editorMode.value === 'readonly') editor.command.executeMode(EditorMode.READONLY)
  else if (editorMode.value === 'form') editor.command.executeMode(EditorMode.FORM)
  else editor.command.executeMode(EditorMode.EDIT)
}

const jumpToCatalog = (item: any) => {
  editor?.command.executeLocationCatalog(item.id)
}

const onFileSelected = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || (!editor && !engineHandle)) return
  if (file.name.endsWith('.json')) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (json.content && json.page && engineHandle) {
          engineHandle.load(json)
        } else if (json.data && editor) {
          editor.command.executeSetValue(json.data)
        } else if (editor) {
          editor.command.executeSetValue(json)
        }
      } catch (err) {
        console.error('Lỗi đọc file JSON:', err)
      }
    }
    reader.readAsText(file)
  } else if (file.name.toLowerCase().endsWith('.docx')) {
    try {
      const result = await importDocx(file, { mode: 'best-effort', profile: props.docxProfile })
      if (result.state && engineHandle) {
        currentState = result.state
        engineHandle.load(result.state)
        syncCommentsFromState(result.state)
        documentTitle.value = file.name
        if (result.report.issues.length) {
          emits('compatibility-warning', result.report)
          ioNotice.value = {
            tone: 'warning',
            text: `Đã import DOCX với ${result.report.issues.length} cảnh báo tương thích.`,
          }
        } else {
          ioNotice.value = { tone: 'success', text: 'Đã import DOCX và giữ metadata thuộc profile hỗ trợ.' }
        }
        emits('imported', { file, state: result.state, report: result.report })
        return
      }
    } catch (err) {
      ioNotice.value = { tone: 'error', text: err instanceof Error ? err.message : 'Không thể import DOCX.' }
      emits('error', err)
    }
  } else {
    const error = new Error('Chỉ hỗ trợ file .docx OOXML hoặc .json. File .doc/.docs không được hỗ trợ.')
    ioNotice.value = { tone: 'error', text: error.message }
    emits('error', error)
  }
  ;(e.target as HTMLInputElement).value = ''
}

const onImageSelected = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file && editor) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        editor?.command.executeImage({ value: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }
}

const getState = () => engineHandle?.getState() || createEmptyDocumentState(currentState)
const getJSON = () => getState().content
const getPage = () => getState().page
const setReadOnly = (readOnly: boolean) => {
  engineHandle?.setReadOnly(readOnly)
  editorMode.value = readOnly ? 'readonly' : 'edit'
}
const setContent = (content: JSONContent) => {
  currentState = createEmptyDocumentState({ ...getState(), content })
  engineHandle?.load(currentState)
  syncCommentsFromState(currentState)
}
const setPage = (page: Partial<KindyPageState>) => {
  currentState = createEmptyDocumentState({
    ...getState(),
    page: { ...getState().page, ...page } as KindyPageState,
  })
  engineHandle?.load(currentState)
}
const getVanillaHTML = async () => {
  const html = editor?.command.getHTML()
  return `<header>${html?.header || ''}</header><main>${html?.main || ''}</main><footer>${html?.footer || ''}</footer>`
}
const getContent = (type: 'html' | 'json' | 'text' = 'json') => {
  if (type === 'json') return getJSON()
  if (type === 'text') return editor?.command.getText().main || ''
  return editor?.command.getHTML().main || ''
}
const preparePrint = async () => ({ html: await getVanillaHTML(), page: getPage() })
const print = () => triggerPrint()
const markContentSaved = () => { contentSaved = true }

defineExpose({
  getEditor: () => editor,
  useEditor: () => engineHandle?.getDocumentController(),
  getCanvasEditor: () => editor,
  getEngine: () => engineHandle,
  getState,
  getContent,
  getJSON,
  getPage,
  getVanillaHTML,
  preparePrint,
  setContent,
  setPage,
  setReadOnly,
  focus: () => engineHandle?.focus(),
  print,
  saveContent: triggerSave,
  markContentSaved,
  isContentSaved: () => contentSaved,
  destroy: destroyEngine,
  comments,
  handleAddComment,
  focusComment,
  deleteComment,
  toggleResolveComment,
})
</script>

<style scoped>
.word-editor-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  min-width: 0;
  background-color: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1f2937;
  overflow: hidden;
  user-select: none;
}

.word-editor-app.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
}

/* 1. Google Docs / Word Web Header */
.docs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 4px 16px;
  background-color: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  flex: 0 0 auto;
}

.docs-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.docs-logo {
  width: 36px;
  height: 36px;
  background-color: #185abd;
  color: #ffffff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  box-shadow: 0 1px 3px rgba(24, 90, 189, 0.25);
  flex-shrink: 0;
}

.docs-info-and-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.docs-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.docs-title-input {
  border: 1px solid transparent;
  background: transparent;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
  outline: none;
  min-width: 200px;
  max-width: 360px;
  transition: all 0.15s;
}

.docs-title-input:hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
}

.docs-title-input:focus {
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.docs-cloud-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f59e0b;
}

.status-dot.saved {
  background-color: #10b981;
}

/* Text Menubar */
.docs-menubar {
  display: flex;
  align-items: center;
  gap: 2px;
}

.menu-dropdown-wrapper {
  position: relative;
}

.menu-tab-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  color: #334155;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.menu-tab-btn:hover,
.menu-tab-btn.active {
  background-color: #f1f5f9;
  color: #1e293b;
}

.docs-dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12);
  min-width: 220px;
  z-index: 1000;
  padding: 6px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  transition: all 0.1s;
}

.menu-item:hover {
  background-color: #f1f5f9;
  color: #2563eb;
}

.menu-divider {
  height: 1px;
  background-color: #e2e8f0;
  margin: 5px 0;
}

/* Docs Header Right */
.docs-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.docs-btn-comments {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.docs-btn-comments:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.docs-btn-comments.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
}

.comment-counter {
  background: #2563eb;
  color: #ffffff;
  font-size: 10px;
  font-weight: bold;
  padding: 1px 6px;
  border-radius: 10px;
}

.docs-btn-share {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #185abd;
  color: #ffffff;
  border: none;
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(24, 90, 189, 0.25);
  transition: background-color 0.15s;
}

.docs-btn-share:hover {
  background: #10438a;
}

.docs-avatar-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #0d9488;
  color: #ffffff;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 2. Single-Row Unified Toolbar */
.docs-toolbar {
  display: flex;
  align-items: center;
  gap: 3px;
  background-color: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
  border-radius: 24px;
  margin: 2px 12px 6px 12px;
  padding: 3px 10px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 0 0 auto;
}

.document-io-notice {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 16px;
  border-bottom: 1px solid transparent;
  font-size: 12px;
  line-height: 1.35;
}

.document-io-notice.is-success {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.document-io-notice.is-warning {
  color: #854d0e;
  background: #fefce8;
  border-color: #fde68a;
}

.document-io-notice.is-error {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.document-io-notice button {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  color: currentColor;
  background: transparent;
  cursor: pointer;
}

.document-io-notice button:hover {
  background: rgb(15 23 42 / 8%);
}

.tb-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 5px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.tb-btn:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}

.tb-btn.active {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #2563eb;
}

.tb-divider {
  width: 1px;
  height: 18px;
  background-color: #cbd5e1;
  margin: 0 4px;
}

.tb-select {
  height: 28px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  color: #334155;
  padding: 0 6px;
  outline: none;
  cursor: pointer;
  transition: all 0.15s;
}

.tb-select:hover {
  background-color: #e2e8f0;
}

.tb-select:focus {
  background-color: #ffffff;
  border-color: #cbd5e1;
}

.tb-zoom-select {
  width: 65px;
}

.tb-style-select {
  width: 125px;
  font-weight: 500;
}

.tb-font-select {
  width: 130px;
}

.tb-size-select {
  width: 65px;
}

.tb-spacing-select {
  width: 60px;
}

.tb-color-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.tb-color-picker:hover {
  background-color: #e2e8f0;
}

.color-text-icon {
  font-size: 13px;
  font-weight: bold;
  border-bottom: 3px solid;
  line-height: 1;
}

.color-highlight-icon {
  font-size: 10px;
  padding: 1px 3px;
  border-radius: 2px;
  color: #000000;
}

.text-clear-btn {
  font-size: 11px;
  font-weight: 600;
}

/* 3. Main Workspace */
.word-workspace {
  display: flex;
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.catalog-sidebar {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #cbd5e1;
  display: flex;
  flex-direction: column;
}

.catalog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.catalog-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #94a3b8;
}

.catalog-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.catalog-empty {
  padding: 16px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

.catalog-item {
  padding: 6px 12px;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.catalog-item:hover {
  background-color: #f1f5f9;
  border-left-color: #2563eb;
  color: #2563eb;
}

.canvas-scroll-container {
  flex: 1;
  background-color: #e5e7eb;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 20px 0;
  min-width: 0;
  min-height: 0;
}

.canvas-host {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: max-content;
}

/* 4. Bottom Status Bar */
.word-statusbar {
  height: 28px;
  background-color: #ffffff;
  border-top: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 11px;
  color: #64748b;
}

.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-btn,
.zoom-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 12px;
  color: #475569;
}

.status-btn:hover,
.zoom-btn:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.status-divider {
  color: #cbd5e1;
}

.mode-select {
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  font-size: 11px;
  color: #334155;
  background: #ffffff;
  padding: 1px 6px;
  outline: none;
}

/* Modal */
.word-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.word-modal {
  background: #ffffff;
  border-radius: 6px;
  width: 320px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
}

.form-row input {
  width: 100px;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.modal-cancel-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.modal-ok-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

/* Comments Sidebar */
.comments-sidebar {
  width: 300px;
  background: #ffffff;
  border-left: 1px solid #cbd5e1;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 6px rgba(0, 0, 0, 0.02);
  z-index: 10;
  min-width: 0;
  min-height: 0;
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.comments-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.comments-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-add-comment-quick {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-add-comment-quick:hover {
  background: #dbeafe;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comments-empty {
  padding: 32px 16px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
}

.comments-empty-tip {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
  line-height: 1.4;
}

.comment-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.15s;
}

.comment-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.06);
}

.comment-card.active {
  border-color: #2563eb;
  background-color: #f8fafc;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.comment-card.resolved {
  opacity: 0.65;
  background: #f8fafc;
}

.comment-card.draft-card {
  border-color: #3b82f6;
  background: #eff6ff;
}

.comment-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 6px;
}

.comment-author .avatar {
  font-size: 16px;
}

.comment-author .name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.2;
}

.comment-author .time {
  font-size: 10px;
  color: #94a3b8;
}

.comment-menu {
  display: flex;
  align-items: center;
  gap: 4px;
}

.comment-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #64748b;
}

.comment-icon-btn:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.comment-icon-btn.delete:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.comment-textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  color: #1e293b;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.comment-textarea:focus {
  border-color: #2563eb;
}

.comment-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

.btn-comment-action {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.btn-comment-action.cancel {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-comment-action.submit {
  background: #2563eb;
  border: none;
  color: #ffffff;
  font-weight: 500;
}

.btn-comment-action.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-body {
  font-size: 12px;
  color: #334155;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;
}

.replies-container {
  margin-top: 8px;
  padding-left: 8px;
  border-left: 2px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reply-card {
  font-size: 11px;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
  font-size: 10px;
  color: #64748b;
}

.reply-content {
  color: #1e293b;
}

.reply-input-wrapper {
  margin-top: 8px;
  display: flex;
  gap: 4px;
}

.reply-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 11px;
  outline: none;
}

.reply-input:focus {
  border-color: #2563eb;
}

.reply-send-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 11px;
  cursor: pointer;
}

.comment-status-badge {
  background: #2563eb;
  color: #ffffff;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 8px;
  margin-left: 4px;
  line-height: 1;
}

@media (max-width: 1024px) {
  .menu-label,
  .dropdown-arrow,
  .styles-group,
  .group-label {
    display: none;
  }

  .word-ribbon-body {
    height: 68px;
    padding-inline: 6px;
  }

  .ribbon-tab-content {
    min-width: max-content;
  }

  .ribbon-large-btn {
    padding-inline: 6px;
  }

  .catalog-sidebar {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 20;
    width: min(280px, 84vw);
    box-shadow: 8px 0 24px rgba(15, 23, 42, 0.14);
  }
}

@media (max-width: 720px) {
  .quick-access-tools .qa-btn:nth-child(n + 3),
  .statusbar-center,
  .status-divider,
  .statusbar-left .status-btn {
    display: none;
  }

  .ribbon-tab-btn {
    padding-inline: 9px;
    white-space: nowrap;
  }

  .word-statusbar {
    padding-inline: 8px;
  }

  .canvas-scroll-container {
    justify-content: flex-start;
    padding-top: 12px;
  }
}
</style>

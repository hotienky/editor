<template>
  <modal
    :visible="visible"
    width="520px"
    @confirm="onConfirm"
    @close="emit('update:visible', false)"
  >
    <template #header>
      <icon :name="targetType === 'header' ? 'page-header' : 'page-footer'" />
      {{ targetType === 'header' ? t('page.header.dialogTitle') : t('page.footer.dialogTitle') }}
    </template>
    
    <div class="kindy-hf-dialog-body">
      <!-- Bố cục: Đơn vs Song song 2 bên (Hợp đồng) -->
      <div class="kindy-hf-form-item">
        <label class="kindy-hf-label">{{ t('page.header.layoutLabel') }}</label>
        <t-radio-group v-model="form.layout" variant="default-filled" size="small">
          <t-radio-button value="single">{{ t('page.header.layoutSingle') }}</t-radio-button>
          <t-radio-button value="split">{{ t('page.header.layoutSplit') }}</t-radio-button>
        </t-radio-group>
      </div>

      <!-- Phạm vi áp dụng Header/Footer: Mọi trang vs Theo tệp (Trang đầu & Trang cuối) -->
      <div class="kindy-hf-form-item">
        <label class="kindy-hf-label">Phạm vi hiển thị</label>
        <t-radio-group v-model="form.scope" variant="default-filled" size="small">
          <t-radio-button value="all">Mọi trang (Từng trang)</t-radio-button>
          <t-radio-button value="file">Theo tệp (Trang đầu & Trang cuối)</t-radio-button>
        </t-radio-group>
      </div>

      <!-- Chế độ Đơn -->
      <template v-if="form.layout === 'single'">
        <div class="kindy-hf-form-item">
          <label class="kindy-hf-label">{{ t('page.header.textContent') }}</label>
          <t-input
            v-model="form.text"
            :placeholder="t('page.header.placeholder')"
            clearable
          />
        </div>
      </template>

      <!-- Chế độ Song song 2 bên (Chuẩn Hợp đồng) -->
      <template v-else>
        <div class="kindy-hf-form-row">
          <div class="kindy-hf-form-item">
            <label class="kindy-hf-label">{{ t('page.header.leftTextLabel') }}</label>
            <t-textarea
              v-model="form.leftText"
              :placeholder="t('page.header.leftTextPlaceholder')"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />
          </div>
          <div class="kindy-hf-form-item">
            <label class="kindy-hf-label">{{ t('page.header.rightTextLabel') }}</label>
            <t-textarea
              v-model="form.rightText"
              :placeholder="t('page.header.rightTextPlaceholder')"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />
          </div>
        </div>
      </template>

      <!-- Ảnh Logo -->
      <div class="kindy-hf-form-item">
        <label class="kindy-hf-label">{{ t('page.header.logoLabel') }}</label>
        <div class="kindy-hf-logo-row">
          <t-input
            v-model="form.logo"
            :placeholder="t('page.header.logoPlaceholder')"
            clearable
            style="flex: 1;"
          />
          <t-upload
            action=""
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            @change="onFileChange"
          >
            <t-button variant="outline" size="small">
              <icon name="upload" />
              {{ t('page.header.uploadLogo') }}
            </t-button>
          </t-upload>
        </div>
      </div>

      <!-- Xem trước Logo & Kích thước -->
      <div v-if="form.logo" class="kindy-hf-form-item logo-preview-item">
        <div class="logo-preview-box">
          <img :src="form.logo" alt="Logo preview" :style="{ width: form.logoWidth + 'px' }" />
        </div>
        <div class="logo-width-control">
          <span>{{ t('page.header.logoSize') }}:</span>
          <t-input-number
            v-model="form.logoWidth"
            size="small"
            :min="16"
            :max="200"
            :step="4"
          />
          <span>px</span>
        </div>
      </div>

      <!-- Căn lề & Đường kẻ -->
      <div class="kindy-hf-form-row">
        <div v-if="form.layout === 'single'" class="kindy-hf-form-item">
          <label class="kindy-hf-label">{{ t('page.header.alignLabel') }}</label>
          <t-radio-group v-model="form.align" variant="default-filled" size="small">
            <t-radio-button value="left">{{ t('page.header.alignLeft') }}</t-radio-button>
            <t-radio-button value="center">{{ t('page.header.alignCenter') }}</t-radio-button>
            <t-radio-button value="right">{{ t('page.header.alignRight') }}</t-radio-button>
          </t-radio-group>
        </div>

        <div class="kindy-hf-form-item">
          <label class="kindy-hf-label">{{ t('page.header.borderLabel') }}</label>
          <t-checkbox v-model="form.showBorder">
            {{ t('page.header.showBorderText') }}
          </t-checkbox>
        </div>
      </div>

      <!-- Màu chữ, Kích thước chữ & Chiều cao lề trang -->
      <div class="kindy-hf-form-row">
        <div class="kindy-hf-form-item">
          <label class="kindy-hf-label">{{ t('page.header.fontColorLabel') }}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input
              v-model="form.fontColor"
              type="color"
              style="width: 32px; height: 32px; border: 1px solid var(--kindy-border-color, #cbd5e1); border-radius: 4px; cursor: pointer; background: transparent; padding: 2px;"
            />
            <t-input
              v-model="form.fontColor"
              size="small"
              style="width: 90px;"
            />
          </div>
        </div>

        <div class="kindy-hf-form-item">
          <label class="kindy-hf-label">{{ t('page.header.fontSize') }}</label>
          <div style="display: flex; align-items: center; gap: 4px;">
            <t-input-number
              v-model="form.fontSize"
              size="small"
              :min="10"
              :max="36"
              :step="1"
            />
            <span>px</span>
          </div>
        </div>

        <div class="kindy-hf-form-item">
          <label class="kindy-hf-label">{{ t('page.header.marginLabel') }}</label>
          <div style="display: flex; align-items: center; gap: 4px;">
            <t-input-number
              v-model="form.margin"
              size="small"
              :min="0.5"
              :max="5"
              :step="0.5"
              :decimal-places="1"
            />
            <span>cm</span>
          </div>
        </div>
      </div>
    </div>
  </modal>
</template>

<script setup>
import { inject, ref, watch } from 'vue'
import Modal from '../modal.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  targetType: {
    type: String,
    default: 'header', // 'header' | 'footer'
  },
})

const emit = defineEmits(['update:visible', 'submit'])
const pageOptions = inject('page')

const form = ref({
  layout: 'single',
  scope: 'all',
  text: '',
  leftText: '',
  rightText: '',
  logo: '',
  logoWidth: 48,
  fontColor: '#475569',
  fontSize: 13,
  margin: 1.5,
  align: 'center',
  showBorder: true,
})

watch(
  () => [props.visible, props.targetType],
  ([val, type]) => {
    if (val && pageOptions?.value) {
      const isHeader = type === 'header'
      const config = isHeader ? pageOptions.value.header : pageOptions.value.footer
      form.value = {
        layout: config?.layout || (config?.leftText || config?.rightText ? 'split' : 'single'),
        scope: config?.scope || 'all',
        text: config?.text || '',
        leftText: config?.leftText || '',
        rightText: config?.rightText || '',
        logo: config?.logo || '',
        logoWidth: config?.logoWidth || 48,
        fontColor: config?.fontColor || '#475569',
        fontSize: config?.fontSize || 13,
        margin: isHeader ? (config?.marginTop || 1.5) : (config?.marginBottom || 1.5),
        align: config?.align || 'center',
        showBorder: config?.showBorder !== false,
      }
    }
  },
  { immediate: true },
)

const onFileChange = (files) => {
  const file = files[0]?.raw || files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.logo = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const onConfirm = () => {
  if (pageOptions?.value) {
    const isHeader = props.targetType === 'header'
    const target = isHeader ? pageOptions.value.header : pageOptions.value.footer
    if (target) {
      target.layout = form.value.layout
      target.scope = form.value.scope
      target.text = form.value.text
      target.leftText = form.value.leftText
      target.rightText = form.value.rightText
      target.logo = form.value.logo
      target.logoWidth = form.value.logoWidth
      target.fontColor = form.value.fontColor
      target.fontSize = form.value.fontSize
      target.align = form.value.align
      target.showBorder = form.value.showBorder
      if (isHeader) {
        target.marginTop = form.value.margin
      } else {
        target.marginBottom = form.value.margin
      }
      target.enable = true
    }
  }
  emit('submit', form.value)
  emit('update:visible', false)
}
</script>

<style lang="less" scoped>
.kindy-hf-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.kindy-hf-form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .kindy-hf-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--kindy-text-color-primary, #1e293b);
  }
}

.kindy-hf-logo-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.logo-preview-item {
  flex-direction: row;
  align-items: center;
  gap: 16px;

  .logo-preview-box {
    padding: 8px;
    border: 1px dashed var(--kindy-border-color, #cbd5e1);
    border-radius: 6px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 60px;
  }

  .logo-width-control {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
}

.kindy-hf-form-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}
</style>

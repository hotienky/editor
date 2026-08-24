import { isRecord } from '@tool-belt/type-predicates'

export const fileMimeTypes = {
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
  ],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'],
}

export const resolveFileAccept = (type, accept = []) => {
  if (type === 'file' && (!accept || accept.length === 0)) {
    return ''
  }
  if (!type || !['image', 'video', 'audio', 'inlineImage'].includes(type)) {
    return accept ? accept.toString() : ''
  }
  let acceptArray = [...(accept || [])]
  const targetType = type === 'inlineImage' ? 'image' : type
  if (acceptArray.includes(`${type}/*`) || acceptArray.includes(`${targetType}/*`) || acceptArray.length === 0) {
    acceptArray = fileMimeTypes[targetType] || []
  } else if (acceptArray.filter((item) => item.startsWith(type) || item.startsWith(targetType)).length > 0) {
    acceptArray = acceptArray.filter((item) => (fileMimeTypes[targetType] || []).includes(item))
  } else {
    acceptArray = ['notAllow']
  }
  return acceptArray.length === 0 ? '' : acceptArray.toString()
}

export const getImageAccept = (options = {}) =>
  resolveFileAccept(
    'image',
    Array.isArray(options?.file?.allowedMimeTypes)
      ? options.file.allowedMimeTypes
      : [],
  )

export const getImageMaxSize = (options = {}) => {
  const maxSize = Number(options?.file?.maxSize)
  return Number.isFinite(maxSize) && maxSize > 0 ? maxSize : 0
}

export const validateImageFileSize = (file, maxSize = 0) =>
  maxSize > 0 && Number(file?.size || 0) > maxSize

export const buildImageUploadValue = (file, response, extra = {}) => {
  const uploadResponse = isRecord(response) ? response : {}
  const url =
    (typeof uploadResponse.url === 'string' && uploadResponse.url) ||
    (typeof file?.url === 'string' && file.url) ||
    ''
  if (!url) {
    return null
  }
  const size = Number(uploadResponse.size ?? file?.size)
  return {
    id: uploadResponse.id ?? null,
    url,
    name:
      (typeof uploadResponse.name === 'string' && uploadResponse.name) ||
      file?.name ||
      '',
    type:
      (typeof uploadResponse.type === 'string' && uploadResponse.type) ||
      file?.type ||
      '',
    size: Number.isFinite(size) && size > 0 ? size : null,
    ...(isRecord(extra) ? extra : {}),
  }
}

export const createImageFileFromDataUrl = async (
  dataUrl,
  fileName = `image-${Date.now()}.png`,
) => {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, {
    type: blob.type || 'image/png',
  })
}

export const createImageFileFromSvg = (
  svg,
  fileName = `image-${Date.now()}.svg`,
  mimeType = 'image/svg+xml',
) =>
  new File([svg], fileName, {
    type: mimeType,
  })

import { PageSizes } from '@kindy/layout'

const fonts = [
  {
    label: { en_US: 'Default Font', zh_CN: '默认字体', vi_VN: 'Mặc định' },
    value: null,
  },
  {
    label: 'Roboto',
    value: 'Roboto',
    url: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
    format: 'woff2',
  },
  {
    label: 'Open Sans',
    value: 'Open Sans',
    url: 'https://fonts.gstatic.com/s/opensans/v40/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2',
    format: 'woff2',
  },
  {
    label: 'Montserrat',
    value: 'Montserrat',
    url: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw0aXpsog.woff2',
    format: 'woff2',
  },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Calibri', value: 'Calibri' },
  { label: 'Cambria', value: 'Cambria' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS' },
  { label: 'Impact', value: 'Impact' },
]

const colors = [
  '#FFF',
  '#000',
  '#4A5366',
  '#3B74EC',
  '#45A2EF',
  '#529867',
  '#CD4A3F',
  '#EA8D40',
  '#EEC543',
  '#8E45D0',
  '#F2F2F2',
  '#7F7F7F',
  '#F4F5F7',
  '#CBDCFC',
  '#E8F6FE',
  '#EDFAF2',
  '#FCEAE9',
  '#FDF3EC',
  '#FEF9E5',
  '#FAECFE',
  '#EEE',
  '#595959',
  '#C6CAD2',
  '#CEEBFD',
  '#CBDCFC',
  '#CBE9D7',
  '#F7CBC9',
  '#FADDC7',
  '#FDEEB5',
  '#EBCAFC',
  '#BFBFBF',
  '#3F3F3F',
  '#828B9D',
  '#A0BEFA',
  '#A7DCFC',
  '#A6D5B8',
  '#F2A19C',
  '#F5BC8C',
  '#FBE281',
  '#CB94F9',
  '#A5A5A5',
  '#262626',
  '#363B44',
  '#2452B2',
  '#3473A1',
  '#417A53',
  '#922B22',
  '#AD642A',
  '#9E8329',
  '#57297D',
  '#939393',
  '#0D0D0D',
  '#25272E',
  '#15316A',
  '#1C415A',
  '#284D34',
  '#511712',
  '#573213',
  '#635217',
  '#36194E',
]

const lineHeights = [
  {
    label: { en_US: 'Single', zh_CN: '单倍行距', vi_VN: 'Giãn dòng đơn (1.0)' },
    value: 1,
  },
  {
    label: {
      en_US: '1.5 Line Spacing',
      zh_CN: '1.5 倍行距',
      vi_VN: 'Giãn dòng 1.5',
    },
    value: 1.5,
  },
  {
    label: {
      en_US: '1.75 Line Spacing',
      zh_CN: '1.75 倍行距',
      vi_VN: 'Giãn dòng 1.75',
    },
    value: 1.75,
    default: true,
  },
  {
    label: { en_US: 'Double', zh_CN: '2 倍行距', vi_VN: 'Giãn dòng đôi (2.0)' },
    value: 2,
  },
  {
    label: {
      en_US: '2.5 Line Spacing',
      zh_CN: '2.5 倍行距',
      vi_VN: 'Giãn dòng 2.5',
    },
    value: 2.5,
  },
  {
    label: { en_US: 'Triple', zh_CN: '3 倍行距', vi_VN: 'Giãn dòng 3.0' },
    value: 3,
  },
]

const symbols = [
  {
    label: {
      en_US: 'Plain Text',
      zh_CN: '普通文本',
      vi_VN: 'Văn bản thuần',
    },
    items: '‹›«»‘’“”‚„¡¿‥…‡‰‱‼⁈⁉⁇©®™§¶⁋',
  },
  {
    label: {
      en_US: 'Currency Symbols',
      zh_CN: '货币符号',
      vi_VN: 'Ký hiệu tiền tệ',
    },
    items: '$€¥£¢₠₡₢₣₤¤₿₥₦₧₨₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽',
  },
  {
    label: {
      en_US: 'Mathematical Symbols',
      zh_CN: '数学符号',
      vi_VN: 'Ký hiệu toán học',
    },
    items: '<>≤≥–—¯‾°−±÷⁄×ƒ∫∑∞√∼≅≈≠≡∈∉∋∏∧∨¬∩∪∂∀∃∅∇∗∝∠¼½¾',
  },
  {
    label: { en_US: 'Arrows', zh_CN: '箭头', vi_VN: 'Ký hiệu mũi tên' },
    items: '←→↑↓⇐⇒⇑⇓⇠⇢⇡⇣⇤⇥⤒⤓↨',
  },
  {
    label: {
      en_US: 'Latin Script',
      zh_CN: '拉丁语',
      vi_VN: 'Ký tự Latin',
    },
    items:
      'ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſ',
  },
]

const emojis = [
  {
    label: {
      en_US: 'Emotions & People',
      zh_CN: '表情与角色',
      vi_VN: 'Biểu cảm & Con người',
    },
    items:
      '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😶‍ 😏 😒 🙄 😬 😮‍ 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 👋 🤚 🖐️ ✋ 🖖 👌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻',
  },
  {
    label: {
      en_US: 'Animals & Nature',
      zh_CN: '动物与自然',
      vi_VN: 'Động vật & Tự nhiên',
    },
    items:
      '🐵 🐒 🦍 🦧 🐶 🐕 🦮 🐕‍🦺 🐩 🐺 🦊 🦝 🐱 🐈 🐈‍⬛ 🦁 🐯 🐅 🐆 🐴 🐎 🦄 🦓 🦌 🐮 🐂 🐃 🐄 🐷 🐖 🐗 🐽 🐏 🐑 🐐 🐪 🐫 🦙 🦒 🐘 🦏 🦛 🐭 🐁 🐀 🐹 🐰 🐇 🐿️ 🦔 🦇 🐻 🐻‍❄️ 🐨 🐼 🦥 🦦 🦨 🦘 🦡 🐾 🦃 🐔 🐓 🐣 🐤 🐥 🐦 🐧 🕊️ 🦅 🦆 🦢 🦉 🦩 🦚 🦜 🐸 🐊 🐢 🦎 🐍 🐲 🐉 🦕 🦖 🐳 🐋 🐬 🦭 🐟 🐠 🐡 🦈 🐙 🐚 🐌 🦋 🐛 🐜 🐝 🐞 🦗 🕷️ 🕸️ 🦂 🦟 🦠 💐 🌸 💮 🏵️ 🌹 🥀 🌺 🌻 🌼 🌷 🌱 🌲 🌳 🌴 🌵 🌾 🌿 ☘️ 🍀 🍁 🍂 🍃 🌒 🌓 🌔 🌕 🌖 🌗 🌘 🌙 🌚 🌛 🌜 ☀️ 🌝 🌞 🪐 🌟 🌠 🌌 ☁️ ⛅ ⛈️ 🌤️ 🌥️ 🌦️ 🌧️ 🌨️ 🌩️ 🌪️ 🌫️ 🌬️ 🌀 🌈 🌂 ☂️ ☔ ⛱️ ⚡ ❄️ ☃️ ⛄ ☄️ 🔥 💧 🌊',
  },
  {
    label: {
      en_US: 'Food & Drink',
      zh_CN: '食物与食品',
      vi_VN: 'Thức ăn & Đồ uống',
    },
    items:
      '🍇 🍉 🍊 🍋 🍌 🍍 🥭 🍎 🍏 🍐 🍑 🍒 🍓 🥝 🍅 🥥 🥑 🍆 🥔 🥕 🌽 🌶️ 🥬 🥦 🧄 🧅 🍄 🥜 🌰 🍞 🥐 🥖 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥙 🧆 🥚 🍳 🥘 🍲 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦀 🦞 🦐 🦑 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🥤 🧃 🧉 🧊 🥢 🍽️ 🍴 🥄 🔪 🏺',
  },
  {
    label: { en_US: 'Activities', zh_CN: '活动', vi_VN: 'Hoạt động' },
    items:
      '🧧 🎁 🎄 🧨 ✨ 🎈 🎉 🏮 🎗️ 🎟️ 🎫 🎖️ 🏆 🏅 🥇 🥈 🥉 ⚽ ⚾ 🥎 🏀 🏐 🏈 🏉 🎾 🥏 🎳 🏏 🏑 🏒 🥍 🏓 🏸 🥊 🥋 🥅 ⛳ ⛸️ 🎣 🤿 🎽 🎿 🛷 🥌 🎯 🪀 🪁 🎱 🔮 🧿 🎮 🕹️ 🎰 🎲 🧩 🧸 ♟️ 🃏 🀄 🎴 🎭 🖼️ 🎨 🧵 🧶',
  },
  {
    label: {
      en_US: 'Travel & Places',
      zh_CN: '旅行与景点',
      vi_VN: 'Du lịch & Địa điểm',
    },
    items:
      '🚈 🚉 🚊 🚝 🚞 🚋 🚌 🚍 🚎 🚐 🚑 🚒 🚓 🚔 🚕 🚖 🚗 🚘 🚙 🚚 🚛 🚜 🏎️ 🏍️ 🛵 🦽 🦼 🛺 🚲 🛴 🛹 🚏 🛣️ 🛤️ 🛢️ ⛽ 🚨 🚥 🚦 🛑 🚧 ⚓ ⛵ 🛶 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🛎️ 🧳 🧭 ⌚ ⏰ ⏱️ ⏲️ 🕰️ 🕛 🕧 🕐 🕜 🕑 🕝 🕒 🕞 🕓 🕟 🕔 🕠 🕕 🕡 🕖 🕢 🕗 🕣 🕘 🕤 🕙 🕥 🕚 🕦',
  },
  {
    label: { en_US: 'Objects', zh_CN: '物品', vi_VN: 'Đồ vật' },
    items:
      '📔 📕 📖 📗 📘 📙 📚 📒 📃 📜 📄 📰 🗞️ 📑 🔖 🏷️ 💰 🔍 🔎 💴 💵 💶 💷 💸 💳 🧾 💹 ✉️ 📧 📨 📩 📤 📥 📦 📫 📪 📬 📭 📮 🗳️ ✏️ ✒️ 🖋️ 🖊️ 🖌️ 🖍️ 📝 💼 📁 📂 🗂️ 📅 📆 🗒️ 🗓️ 📇 📈 📉 📊 📋 📌 📍 📎 🖇️ 📏 📐 ✂️ 🗃️ 🗄️ 🗑️ 🔒 🔓 🔏 🔐 🔑 🗝️ 🔨 🪓 ⛏️ ⚒️ 🛠️ 🗡️ ⚔️ 🔫 🏹 🛡️ 🔧 🔩 ⚙️ 🗜️ ⚖️ 🦯 🔗 ⛓️ 🧰 🧲 ⚗️ 🧪 🧫 🧬 🔬 🔭 📡 💉 🩸 💊 🩹 🩺 🚪 🛏️ 🛋️ 🪑 🚽 🚿 🛁 🪒 🧴 🧷 🧹 🧺 🧻 🧼 🧽 🧯 🛒 🚬 ⚰️ ⚱️ 💎 🔇 🔈 🔉 🔊 🔔 🔕 🔋 🔌 💻 🖥️ 🖨️ ⌨️ 🖱️ 🖲️ 📷 🧱',
  },
  {
    label: { en_US: 'Symbols', zh_CN: '符号', vi_VN: 'Biểu tượng' },
    items:
      '💡 ✅ ☑️ ✔️ ❌ ❎ ❓ ❗ ❔ ❕ ⌛ ⏳ 💰 🆒 🆕 🆖 🅾️ 🆗 🆘 🈲 🉑 🈸 ⛔ 🚫 📵 ✳️ ✴️ ❇️ 🔟 🔠 🔡 🔢 🔣 🔤 🅰️ 🆎 🅱️ 🆑 🆒 🆓 ℹ️ 🆔 🆕 🆖 🅾️ 🆗 🅿️ 🆘 🆙 🆚 🈁 🈂️ 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔳 🔲 💌 💘 💝 💖 💗 💓 💞 💕 💟 ❣️ 💔 🤍 💯 💢 💥 💬 💤 ➰ ➿ 🔅 📴 ➡️ 🔃 🔄 🔙 🔚 🔛 🔝 🔀 🔁 🔂',
  },
  {
    label: { en_US: 'Flags', zh_CN: '旗帜', vi_VN: 'Cờ' },
    items: '🏁 🚩 🏴 🏳️ 🏳️‍🌈‍',
  },
]

const pageSizes = [
  ...['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((label) => ({
    label,
    ...PageSizes[label],
    ...(label === 'A4' ? { default: true } : {}),
  })),
  { label: 'B5', width: 17.6, height: 25.0 },
  {
    label: {
      en_US: 'No. 5 Envelope',
      zh_CN: '5号信封',
      vi_VN: 'Phong bì Số 5',
    },
    width: 10.9,
    height: 12.9,
  },
  {
    label: {
      en_US: 'No. 6 Envelope',
      zh_CN: '6号信封',
      vi_VN: 'Phong bì Số 6',
    },
    width: 11.9,
    height: 22.9,
  },
  {
    label: {
      en_US: 'No. 7 Envelope',
      zh_CN: '7号信封',
      vi_VN: 'Phong bì Số 7',
    },
    width: 16.1,
    height: 22.8,
  },
  {
    label: {
      en_US: 'No. 9 Envelope',
      zh_CN: '9号信封',
      vi_VN: 'Phong bì Số 9',
    },
    width: 22.8,
    height: 32.3,
  },
  {
    label: {
      en_US: 'Legal Paper',
      zh_CN: '法律用纸',
      vi_VN: 'Khổ giấy Pháp lý (Legal)',
    },
    ...PageSizes.LEGAL,
  },
  {
    label: {
      en_US: 'Letter Paper',
      zh_CN: '信纸',
      vi_VN: 'Khổ giấy Thư (Letter)',
    },
    ...PageSizes.LETTER,
  },
]

export default {
  fonts,
  colors,
  lineHeights,
  symbols,
  emojis,
  pageSizes,
}

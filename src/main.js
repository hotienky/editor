import { createApp } from 'vue'

import App from './app.vue'
import { useKindyEditor } from './components'

const app = createApp(App)

const options = {}

app.use(useKindyEditor, options)

app.mount('#app')

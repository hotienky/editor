import { createApp } from 'vue'

import App from './app.vue'
import { useUmoEditor } from './components'

const app = createApp(App)

const options = {}

app.use(useUmoEditor, options)

app.mount('#app')

import { Extension, textInputRule } from '@tiptap/core'

export const AutoSubstitutions = Extension.create({
  name: 'autoSubstitutions',

  addOptions() {
    return {
      smartQuotes: true,
      customRules: true,
    }
  },

  addInputRules() {
    const rules = []

    if (this.options.customRules) {
      rules.push(
        textInputRule({ find: /-->\s$/, replace: '→ ' }),
        textInputRule({ find: /<--\s$/, replace: '← ' }),
        textInputRule({ find: /\(c\)\s$/i, replace: '© ' }),
        textInputRule({ find: /\(r\)\s$/i, replace: '® ' }),
        textInputRule({ find: /\(tm\)\s$/i, replace: '™ ' }),
        textInputRule({ find: /1\/2\s$/, replace: '½ ' }),
        textInputRule({ find: /1\/4\s$/, replace: '¼ ' }),
        textInputRule({ find: /3\/4\s$/, replace: '¾ ' }),
      )
    }

    return rules
  },
})

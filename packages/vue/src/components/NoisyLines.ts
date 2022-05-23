import { defineComponent, h, onMounted, PropType, ref } from 'vue'
import { noisyLinesBackground } from 'threejs-toys'

type ResizeType = boolean | 'window'

export default defineComponent({
  props: {
    width: { type: Number },
    height: { type: Number },
    resize: { type: [Boolean, String] as PropType<ResizeType>, default: true }
  },
  setup (props, { attrs }) {
    const root = ref()

    onMounted(() => {
      const bg = noisyLinesBackground({
        el: root.value
      })
    })

    return { root }
  },
  render () {
    console.log()
    return h('div', { ref: 'root' }, this.$slots ? this.$slots.default : [])
  }
})

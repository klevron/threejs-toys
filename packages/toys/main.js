import './style.css'

// import background from './src/cursors/neon-cursor'
import background from './src/backgrounds/noisy-lines'

const bg = background({ el: document.getElementById('app') })

document.body.addEventListener('click', () => {
  bg.config.colors = [Math.round(Math.random() * 0xffffff), Math.round(Math.random() * 0xffffff)]
  bg.config.minStroke = Math.random() * 2
  bg.config.maxStroke = bg.config.minStroke + Math.random() * 5
  bg.drawTexture()

  bg.config.timeCoef = 0.000025 + Math.random() * 0.001
  bg.uniforms.uCoordScale.value = 0.5 + Math.random() * 4.5
  bg.uniforms.uDisplacementScale.value = 0.00025 + Math.random() * 0.01
})

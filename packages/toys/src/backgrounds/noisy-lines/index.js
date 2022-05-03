import { Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import three from '../../three'
import useCanvasTexture from '../../tools/canvasTexture'
import psrdnoise from '../../glsl/psrdnoise2.glsl'
import { colorScale } from '../../tools/color'

const defaultConfig = {
  colors: [0xffffff, 0x000000],
  minStroke: 5,
  maxStroke: 5,
  timeCoef: 0.0005,
  coordScale: 2,
  displacementScale: 0.002
}

export default function (params) {
  const config = { ...defaultConfig, ...params }

  const canvasTexture = useCanvasTexture({ width: 1, height: 4096 })
  drawTexture()

  const uniforms = {
    uMap: { value: canvasTexture.texture },
    uTime: { value: 0 },
    uCoordScale: { value: config.coordScale },
    uDisplacementScale: { value: config.displacementScale }
  }

  const geometry = new PlaneGeometry()

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uCoordScale;
      uniform float uDisplacementScale;
      varying vec2 vUv;
      ${psrdnoise}
      void main() {
        vec2 p = vec2(0.0);
        vec2 grad;
        float n = psrdnoise(vUv * uCoordScale, p, uTime, grad);
        // grad *= uCoordScale;
        vec2 uv = vUv + uDisplacementScale * grad;
        gl_FragColor = texture2D(uMap, uv.yx);
      }
    `
  })

  const mesh = new Mesh(geometry, material)

  three({
    el: params.el,
    antialias: true,
    initScene ({ camera, scene, wWidth, wHeight }) {
      mesh.scale.set(wWidth * 2, wHeight * 2, 1)
      scene.add(mesh)

      camera.position.set(0, -30, 7)
      camera.lookAt(0, -19, 0)
    },
    afterResize ({ wWidth, wHeight }) {
    },
    beforeRender ({ clock }) {
      uniforms.uTime.value = clock.time * config.timeCoef
    },
    onPointerMove ({ position, nPosition, delta }) {
    },
    onPointerLeave () {
    }
  })

  return { config, uniforms, drawTexture }

  function drawTexture () {
    const ctx = canvasTexture.ctx
    ctx.lineWidth = 0

    const { width, height } = canvasTexture.canvas
    const cscale = colorScale(config.colors)

    let y = 0
    let dy
    while (y < height) {
      dy = config.minStroke + Math.random() * (config.maxStroke - config.minStroke)

      // ctx.strokeStyle = cscale.getColorAt(Math.random()).getStyle()
      // ctx.lineWidth = dy + 1
      // ctx.beginPath()
      // ctx.moveTo(0, y + dy / 2)
      // ctx.lineTo(width, y + dy / 2)
      // ctx.stroke()
      // ctx.closePath()

      ctx.fillStyle = cscale.getColorAt(Math.random()).getStyle()
      ctx.beginPath()
      ctx.rect(0, y - 1, width, dy + 1)
      ctx.fill()
      ctx.closePath()

      y += dy
    }

    canvasTexture.texture.needsUpdate = true
  }
}

import { AmbientLight, BoxGeometry, Mesh, MeshStandardMaterial, PlaneGeometry, PointLight } from 'three'
import chroma from 'chroma-js'
import three from '../../three'
import useCanvasTexture from '../../tools/canvasTexture'
import psrdnoise from '../../glsl/psrdnoise3.glsl'

const defaultConfig = {
  minStroke: 0.5,
  maxStroke: 10,
  timeCoef: 0.001,
  coordScale: 5,
  displacementScale: 1
}

export default function (params) {
  const config = { ...defaultConfig, ...params }

  const canvasTexture = useCanvasTexture({ width: 1, height: 1024 })
  drawTexture()

  const geometry = new PlaneGeometry(1, 1, 256, 256)
  // const geometry = new BoxGeometry(20, 20, 20, 128, 128, 128)

  const uniforms = {
    uTime: { value: 0 },
    uCoordScale: { value: config.coordScale },
    uDisplacementScale: { value: config.displacementScale }
  }

  const material = new MeshStandardMaterial({
    map: canvasTexture.texture,
    metalness: 0,
    roughness: 1,
    onBeforeCompile: shader => {
      Object.keys(uniforms).forEach(key => {
        shader.uniforms[key] = uniforms[key]
      })
      shader.vertexShader = `
        uniform float uTime;
        uniform float uCoordScale;
        uniform float uDisplacementScale;
        ${psrdnoise}
      ` + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '')
      shader.vertexShader = shader.vertexShader.replace('#include <normal_vertex>', '')
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        vec3 p = vec3(0.0);

        vec3 grad;
        float d = psrdnoise(position * uCoordScale, p, uTime, grad);
        grad *= uCoordScale;
        vec3 transformed = position + uDisplacementScale * d * normal;
        // vec3 transformed = position + uDisplacementScale * d * normalize(position);

        vec3 N_ = grad - dot(grad, normal) * normal;
        vNormal = normal - uDisplacementScale * N_;
        vNormal = normalMatrix * normalize(vNormal);
      `)
    }
  })

  const mesh = new Mesh(geometry, material)

  three({
    el: params.el,
    antialias: true,
    // init ({ renderer }) {
    // },
    // initCamera ({ camera }) {
    // },
    initScene ({ scene }) {
      scene.add(new AmbientLight(0xaaaaaa))

      const light = new PointLight(0xffffff, 1)
      light.position.set(0, 0, 50)
      scene.add(light)

      scene.add(mesh)
    },
    afterResize ({ width, height, wWidth, wHeight }) {
      mesh.scale.set(wWidth, wHeight, 1)
    },
    beforeRender ({ clock, width, height, wWidth, wHeight }) {
      uniforms.uTime.value = clock.time * config.timeCoef
    },
    onPointerMove ({ position, nPosition, delta }) {
    },
    onPointerLeave () {
    }
  })

  function drawTexture () {
    const ctx = canvasTexture.ctx
    const { width, height } = canvasTexture.canvas
    const cscale = chroma.scale([chroma.random(), chroma.random(), chroma.random()])

    let y = 0
    let dy
    while (y < height) {
      dy = config.minStroke + Math.random() * (config.maxStroke - config.minStroke)
      ctx.strokeStyle = cscale(Math.random()).hex()
      ctx.lineWidth = dy
      ctx.beginPath()
      ctx.moveTo(0, y + dy / 2)
      ctx.lineTo(width, y + dy / 2)
      ctx.stroke()
      ctx.closePath()
      y += dy
    }

    // ctx.clearRect(0, 0, width, height)

    // ctx.beginPath()
    // ctx.moveTo(0, 0)
    // ctx.lineTo(width, 0)
    // ctx.lineTo(width, height)
    // ctx.lineTo(0, height)
    // ctx.closePath()
  }

  return { config }
}

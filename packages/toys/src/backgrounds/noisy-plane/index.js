import { AmbientLight, BoxGeometry, DirectionalLight, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, PointLight } from 'three'
import three from '../../three'
import useCanvasTexture from '../../tools/canvasTexture'
import psrdnoise from '../../glsl/psrdnoise3.glsl'
import { colorScale } from '../../tools/color'

const defaultConfig = {
  colors: [0xffffff, 0x000000],
  minStroke: 0.5,
  maxStroke: 5,
  timeCoef: 0.001,
  coordScale1: 5,
  coordScale2: 2,
  displacementScale: 1,
  mouseScale: 0.25,
  mouseLerp: 0.025
}

export default function (params) {
  const config = { ...defaultConfig, ...params }

  const canvasTexture = useCanvasTexture({ width: 1, height: 2048 })
  canvasTexture.texture.rotation = Math.PI / 2
  canvasTexture.texture.center.set(0.5, 0.5)
  drawTexture()

  const geometry = new PlaneGeometry(1, 1, 512, 512)
  // const geometry = new BoxGeometry(20, 20, 20, 128, 128, 128)

  const uniforms = {
    uTime: { value: 0 },
    uCoordScale1: { value: config.coordScale1 },
    uCoordScale2: { value: config.coordScale2 },
    uDisplacementScale: { value: config.displacementScale }
  }

  const material = new MeshStandardMaterial({
    // map: canvasTexture.texture,
    metalness: 0.5,
    roughness: 0.5,
    onBeforeCompile: shader => {
      Object.keys(uniforms).forEach(key => {
        shader.uniforms[key] = uniforms[key]
      })
      shader.vertexShader = `
        uniform float uTime;
        uniform float uCoordScale1;
        uniform float uCoordScale2;
        uniform float uDisplacementScale;
        ${psrdnoise}
      ` + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '')
      shader.vertexShader = shader.vertexShader.replace('#include <normal_vertex>', '')
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        // vec3 p = vec3(0.0); vec3 grad;
        // float d = psrdnoise(position * uCoordScale, p, uTime, grad);
        // grad *= uCoordScale;
        // vec3 transformed = position + uDisplacementScale * d * normal;

        vec3 p = vec3(0.0); vec3 grad;
        float n = 0.5 + 0.4 * psrdnoise(position * uCoordScale1, p, uTime, grad);
        vec3 warped = position * uCoordScale2 + 0.1 * grad;
        n += 0.2 * psrdnoise(warped, p * uCoordScale2, uTime * uCoordScale2, grad);

        vec3 transformed = position + uDisplacementScale * n * normal;

        vec3 N_ = grad - dot(grad, normal) * normal;
        vNormal = normal - uDisplacementScale * N_;
        vNormal = normalMatrix * normalize(vNormal);
      `)
    }
  })

  const mesh = new Mesh(geometry, material)

  three({
    el: params.el,
    alpha: true,
    antialias: true,
    // init ({ renderer }) {
    // },
    // initCamera ({ camera }) {
    // },
    initScene ({ scene }) {
      scene.add(new AmbientLight(0xaaaaaa))

      const light = new DirectionalLight(0xffffff, 0.5)
      light.position.set(0, 10, 50)
      scene.add(light)

      const lightTarget = new Object3D()
      lightTarget.position.set(0, -10, 0)
      light.target = lightTarget
      scene.add(lightTarget)

      // const light = new PointLight(0xffffff, 0.5)
      // light.position.set(0, 0, 50)
      // scene.add(light)

      scene.add(mesh)
    },
    afterResize ({ wWidth, wHeight }) {
      // mesh.scale.set(wWidth * 2, wHeight * 4, 1)
      mesh.scale.set(wWidth, wHeight, 1)
    },
    beforeRender ({ clock }) {
      uniforms.uTime.value = clock.time * config.timeCoef
    },
    onPointerMove ({ position, nPosition, delta }) {
    },
    onPointerLeave () {
    }
  })

  return { config, uniforms, material, drawTexture }

  function drawTexture () {
    const ctx = canvasTexture.ctx
    const { width, height } = canvasTexture.canvas
    const cscale = colorScale(config.colors)

    let y = 0
    let dy
    while (y < height) {
      dy = config.minStroke + Math.random() * (config.maxStroke - config.minStroke)
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

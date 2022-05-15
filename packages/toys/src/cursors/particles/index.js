import { AdditiveBlending, BufferAttribute, BufferGeometry, HalfFloatType, MathUtils, Points, ShaderMaterial, Vector2 } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import psrdnoise from '../../glsl/psrdnoise3.glsl'
import three from '../../three'
import { colorScale } from '../../tools/color'

const { randFloat: rnd, randFloatSpread: rndFS } = MathUtils

const defaultConfig = {
  colors: [Math.random() * 0xffffff, Math.random() * 0xffffff]
}

export default function (params) {
  const config = { ...defaultConfig, ...params }

  const WIDTH = 512
  const COUNT = WIDTH * WIDTH

  let gpu
  let dtPosition, dtVelocity
  let velocityVariable, positionVariable
  let velocityUniforms, positionUniforms

  const uTime = { value: 0 }
  const uCoordScale = { value: 0.5 }
  const uMouse = { value: new Vector2() }
  const uMouseDirection = { value: new Vector2() }

  const mouseTarget = new Vector2()

  let geometry, material, mesh

  three({
    ...commonConfig(params),
    antialias: false,
    initRenderer ({ renderer }) {
      initGPU(renderer)
    },
    initScene ({ scene }) {
      initParticles()
      scene.add(mesh)
    },
    afterResize ({ width, height }) {
    },
    beforeRender ({ width, height, wWidth, wHeight, clock, pointer }) {
      mouseTarget.x = pointer.nPosition.x * 0.5 * wWidth
      mouseTarget.y = pointer.nPosition.y * 0.5 * wHeight
      uMouse.value.lerp(mouseTarget, 0.05)
      // uMouseDirection.value.copy(pointer.delta)

      uTime.value = clock.time
      gpu.compute()
      material.uniforms.texturePosition.value = gpu.getCurrentRenderTarget(positionVariable).texture
      material.uniforms.textureVelocity.value = gpu.getCurrentRenderTarget(velocityVariable).texture
    },
    onPointerMove ({ position, nPosition, delta }) {
      uMouseDirection.value.copy(delta)
    },
    onPointerLeave () {
    }
  })

  return { config }

  /**
   */
  function initGPU (renderer) {
    gpu = new GPUComputationRenderer(WIDTH, WIDTH, renderer)
    if (!renderer.capabilities.isWebGL2) {
      gpu.setDataType(HalfFloatType)
    }

    dtPosition = gpu.createTexture()
    dtVelocity = gpu.createTexture()
    initTextures(dtPosition, dtVelocity)

    velocityVariable = gpu.addVariable('textureVelocity', `
      ${psrdnoise}
      uniform float uTime;
      uniform float uCoordScale;
      uniform vec2 uMouse;
      uniform vec2 uMouseDirection;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);

        if (pos.w == -1.0) {
          vel.x = 0.0;
          vel.y = 0.0;
          vel.z = 0.0;
        } else {
          vec3 grad;
          vec3 p = vec3(0.0);
          float n = psrdnoise(pos.xyz * uCoordScale, p, 0.0, grad);
          vel.xyz += grad * 0.0005 * pos.w;
          // vel.z = 0.05;
        }
        gl_FragColor = vel;
      }
    `, dtVelocity)

    positionVariable = gpu.addVariable('texturePosition', `
      uniform float uTime;
      uniform float uCoordScale;
      uniform vec2 uMouse;
      uniform vec2 uMouseDirection;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);
        if (pos.w == -1.0) { pos.w = vel.w; }
        pos.w -= 0.008;
        if (pos.w <= 0.0) {
          pos.xy = uMouse.xy;
          pos.z = 0.0;
          pos.w = -1.0;
        } else {
          pos.xyz += vel.xyz;
        }
        gl_FragColor = pos;
      }
    `, dtPosition)

    gpu.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable])
    gpu.setVariableDependencies(positionVariable, [positionVariable, velocityVariable])

    velocityUniforms = velocityVariable.material.uniforms
    velocityUniforms.uTime = uTime
    velocityUniforms.uCoordScale = uCoordScale
    velocityUniforms.uMouse = uMouse
    velocityUniforms.uMouseDirection = uMouseDirection

    positionUniforms = positionVariable.material.uniforms
    positionUniforms.uTime = uTime
    positionUniforms.uCoordScale = uCoordScale
    positionUniforms.uMouse = uMouse
    positionUniforms.uMouseDirection = uMouseDirection

    const error = gpu.init()
    if (error !== null) {
      console.error(error)
    }
  }

  function initParticles () {
    geometry = new BufferGeometry()
    const positions = new Float32Array(COUNT * 3)
    const uvs = new Float32Array(COUNT * 2)
    const colors = new Float32Array(COUNT * 3)

    for (let i = 0; i < COUNT * 3; i += 3) {
      positions[i] = 0
      positions[i + 1] = 0
      positions[i + 2] = 0
    }

    let index = 0
    for (let j = 0; j < WIDTH; j++) {
      for (let i = 0; i < WIDTH; i++) {
        uvs[index++] = i / (WIDTH - 1)
        uvs[index++] = j / (WIDTH - 1)
      }
    }

    const cscale = colorScale(config.colors)
    for (let i = 0; i < COUNT * 3; i += 3) {
      const color = cscale.getColorAt(Math.random())
      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    }

    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))

    material = new ShaderMaterial({
      blending: AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true,
      uniforms: {
        texturePosition: { value: null },
        textureVelocity: { value: null }
      },
      vertexShader: `
        uniform sampler2D texturePosition;
        uniform sampler2D textureVelocity;
        varying vec4 vPos;
        varying vec4 vVel;
        varying vec3 vCol;
        void main() {
          vCol = color;
          vPos = texture2D(texturePosition, uv);
          vVel = texture2D(textureVelocity, uv);
          vec4 mvPosition = modelViewMatrix * vec4(vPos.xyz, 1.0);
          // gl_PointSize = length(vel.xyz) * 100.0;
          gl_PointSize = vPos.w * 3.0;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec4 vPos;
        varying vec4 vVel;
        varying vec3 vCol;
        void main() {
          // gl_FragColor = vec4(vPos.w, 0.5, 0.2, vPos.w);
          gl_FragColor = vec4(mix(vCol, vec3(1, 0, 0), vPos.w * 0.5), vPos.w * 0.5);
          // gl_FragColor = vec4(mix(vCol, vec3(0, 0, 1), vPos.w * 0.5), vPos.w * 0.5);
          // gl_FragColor = vec4(vCol, vPos.w * 0.5);
        }
      `
    })

    mesh = new Points(geometry, material)
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
  }

  /**
   */
  function initTextures (texturePosition, textureVelocity) {
    const posArray = texturePosition.image.data
    const velArray = textureVelocity.image.data
    for (let k = 0, kl = posArray.length; k < kl; k += 4) {
      posArray[k + 0] = 0 // rndFS(100)
      posArray[k + 1] = 0 // rndFS(100)
      posArray[k + 2] = 0 // rndFS(100)
      posArray[k + 3] = rnd(0.1, 2)

      velArray[k + 0] = 0 // rndFS(0.2)
      velArray[k + 1] = 0 // rndFS(0.2)
      velArray[k + 2] = 0 // rndFS(0.2)
      velArray[k + 3] = rnd(0.1, 2)
    }
  }
}

/**
 */
function commonConfig (params) {
  const config = {}
  const keys = ['el', 'canvas', 'width', 'height', 'resize']
  keys.forEach(key => {
    if (params[key] !== undefined) config[key] = params[key]
  })
  return config
}

import { AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, Color, ConeGeometry, DoubleSide, Float32BufferAttribute, HalfFloatType, InstancedBufferAttribute, InstancedMesh, MathUtils, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, Plane, PlaneGeometry, PointLight, Raycaster, SphereGeometry, TextureLoader, Vector2, Vector3 } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import three from '../../three'
import { colorScale } from '../../tools/color'
import psrdnoise from '../../glsl/psrdnoise3.glsl'

const { randFloat: rnd, randFloatSpread: rndFS } = MathUtils

const defaultConfig = {
  gpgpuSize: 16,
  colors: [0x00ff00, 0x0000ff],
  color: 0xff0000
}

export default async function (params) {
  const config = { ...defaultConfig, ...params }

  const WIDTH = config.gpgpuSize
  const COUNT = WIDTH * WIDTH

  let gpu
  let dtPosition, dtVelocity
  let velocityVariable, positionVariable

  const uTexturePosition = { value: null }
  const uOldTexturePosition = { value: null }
  const uTextureVelocity = { value: null }
  const uTime = { value: 0 }
  const uMouse = { value: new Vector3() }
  const uMouseDirection = { value: new Vector3() }
  const uniforms = { uTexturePosition, uOldTexturePosition, uTextureVelocity, uTime, uMouse, uMouseDirection }

  let effectComposer
  let renderPass, bloomPass

  let camera
  let light
  let geometry, material, iMesh

  const tl = new TextureLoader()

  const mousePlane = new Plane(new Vector3(0, 0, 1), 0)
  const mousePosition = new Vector3()
  const raycaster = new Raycaster()

  const texture1 = await tl.loadAsync('/b1.png')
  const texture2 = await tl.loadAsync('/b2.png')
  const texture3 = await tl.loadAsync('/b3.png')
  const texture4 = await tl.loadAsync('/b4.png')

  three({
    ...commonConfig(params),
    antialias: true,
    initRenderer ({ renderer }) {
      initGPU(renderer)
    },
    initCamera (three) {
      camera = three.camera
      camera.position.z = 70
    },
    initScene ({ renderer, width, height, camera, scene }) {
      initScene(scene)

      renderPass = new RenderPass(scene, camera)

      bloomPass = new UnrealBloomPass(new Vector2(width, height), 1.5, 0.5, 0.25)
      // bloomPass.threshold = params.bloomThreshold
      // bloomPass.strength = params.bloomStrength
      // bloomPass.radius = params.bloomRadius

      effectComposer = new EffectComposer(renderer)
      effectComposer.addPass(renderPass)
      effectComposer.addPass(bloomPass)
    },
    afterResize ({ width, height }) {
      if (effectComposer) effectComposer.setSize(width, height)
    },
    beforeRender ({ clock }) {
      // light.position.lerp(mousePosition, 0.05)

      uTime.value = clock.time * 0.001
      uMouse.value.copy(mousePosition)

      gpu.compute()
      uTexturePosition.value = positionVariable.renderTargets[gpu.currentTextureIndex].texture
      uOldTexturePosition.value = positionVariable.renderTargets[gpu.currentTextureIndex === 0 ? 1 : 0].texture
      uTextureVelocity.value = velocityVariable.renderTargets[gpu.currentTextureIndex].texture
    },
    // render () {
    //   effectComposer.render()
    // },
    onPointerMove ({ nPosition }) {
      raycaster.setFromCamera(nPosition, camera)
      camera.getWorldDirection(mousePlane.normal)
      raycaster.ray.intersectPlane(mousePlane, mousePosition)
    },
    onPointerLeave () {
      mousePosition.set(0, 0, 0)
    }
  })

  return { config, uniforms }

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
      uniform vec3 uMouse;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);

        vec3 grad;
        float n = psrdnoise(pos.xyz * 0.01, vec3(0), 0.0, grad);
        grad = clamp(grad * 0.001, -0.2, 0.2);
        vel.xyz = vel.xyz + pos.w * grad;
        // vel.xyz = clamp(vel.xyz, -0.5, 0.5);

        // vel.xyz = vel.xyz + pos.w * 0.005 * clamp(normalize(uMouse - pos.xyz), -0.5, 0.5);
        // vel.xyz = clamp(vel.xyz, -0.1, 0.1);
        vel.xyz = vel.xyz + pos.w * 0.01 * normalize(uMouse - pos.xyz);
        vel.xyz = clamp(vel.xyz, -0.25, 0.25);

        vel.w = mod(vel.w + length(vel.xyz) * (0.5 + pos.w) * 0.5, 6.2831853071);
        gl_FragColor = vel;
      }
    `, dtVelocity)

    positionVariable = gpu.addVariable('texturePosition', `
      ${psrdnoise}
      uniform float uTime;
      uniform vec3 uMouse;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);
        pos.xyz += vel.xyz;
        gl_FragColor = pos;
      }
    `, dtPosition)

    gpu.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable])
    gpu.setVariableDependencies(positionVariable, [positionVariable, velocityVariable])

    Object.keys({ uTime, uMouse }).forEach(key => {
      velocityVariable.material.uniforms[key] = uniforms[key]
      positionVariable.material.uniforms[key] = uniforms[key]
    })

    const error = gpu.init()
    if (error !== null) {
      console.error(error)
    }
  }

  /**
   */
  function initScene (scene) {
    scene.background = new Color(0xffffff)
    geometry = new PlaneGeometry(4, 2.5, 6, 1).rotateX(Math.PI / 2)

    const mapIndexes = new Int32Array(COUNT)
    const gpuUvs = new Float32Array(COUNT * 2)
    let i1 = 0
    let i2 = 0
    for (let j = 0; j < WIDTH; j++) {
      for (let i = 0; i < WIDTH; i++) {
        mapIndexes[i1++] = Math.floor(Math.random() * 4)
        gpuUvs[i2++] = i / (WIDTH - 1)
        gpuUvs[i2++] = j / (WIDTH - 1)
      }
    }
    geometry.setAttribute('gpuUv', new InstancedBufferAttribute(gpuUvs, 2))
    geometry.setAttribute('mapIndex', new InstancedBufferAttribute(mapIndexes, 1))

    material = new MeshBasicMaterial({
      // color: 0xffffff,
      // metalness: 0.75,
      // roughness: 0.25,
      // transparent: true,
      // opacity: 0.85,
      // flatShading: true,
      // metalness: 0,
      // roughness: 1,
      map: tl.load('/b4.png'),
      side: DoubleSide,
      transparent: true,
      alphaTest: 0.5,
      onBeforeCompile: (shader) => {
        Object.keys(uniforms).forEach(key => {
          shader.uniforms[key] = uniforms[key]
        })
        shader.uniforms.uMaps = {
          value: [texture1, texture2, texture3, texture4]
        }
        shader.vertexShader = `
          uniform sampler2D uTexturePosition;
          uniform sampler2D uOldTexturePosition;
          uniform sampler2D uTextureVelocity;
          uniform float uTime;
          uniform vec3 uMouse;
          attribute vec2 gpuUv;
          attribute int mapIndex;
          varying vec4 vPos;
          varying vec4 vVel;
          flat out int vMapIndex;

          mat3 lookAt(vec3 origin, vec3 target, vec3 up) {
            vec3 z = target - origin;
            if (z.x * z.x + z.y * z.y + z.z * z.z == 0.0) { z.z = 1.0; }
            z = normalize(z);
            vec3 x = cross(up, z);
            if (x.x * x.x + x.y * x.y + x.z * x.z == 0.0) {
              if (abs(up.z) == 1.0) { z.x += 0.0001; }
              else { z.z += 0.0001; }
              x = cross(up, z);
            }
            x = normalize(x);
            vec3 y = cross(z, x);
            return mat3(x, y, z);
          }

          mat4 iMatrix(vec3 pos, mat3 rmat, float scale) {
            return mat4(
              rmat[0][0] * scale, rmat[0][1] * scale, rmat[0][2] * scale, 0.0,
              rmat[1][0] * scale, rmat[1][1] * scale, rmat[1][2] * scale, 0.0,
              rmat[2][0] * scale, rmat[2][1] * scale, rmat[2][2] * scale, 0.0,
              pos.x, pos.y, pos.z, 1.0
            );
          }
        ` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vPos = texture2D(uTexturePosition, gpuUv);
          vec4 oldPos = texture2D(uOldTexturePosition, gpuUv);
          vVel = texture2D(uTextureVelocity, gpuUv);
          vMapIndex = mapIndex;

          vec3 up =vec3(0, 1, 0); //  normalize(uMouse - vPos.xyz);
          mat3 rmat = lookAt(oldPos.xyz, vPos.xyz, up);
          mat4 im = iMatrix(vPos.xyz, rmat, 0.5 + vPos.w);

          // transformed.z *= length(vVel) * 2.0;
          float dx = abs(transformed.x);
          if (dx > 0.0) {
            dx = smoothstep(0.0, 2.0, dx * 0.75);
            transformed.y = sin(vVel.w - dx) * abs(transformed.x);
          }
          // transformed.y = vVel.z;
          vec4 mvPosition = modelViewMatrix * im * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        `)

        shader.fragmentShader = `
          // #define NUM_TEXTURES 4
          const int NUM_TEXTURES = 4;
          uniform sampler2D uMaps[NUM_TEXTURES];
          flat in int vMapIndex;
        ` + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          vec4 tex;
          switch (vMapIndex) {
            case 0:
              tex = texture2D(uMaps[0], vUv);
              break;
            case 1:
              tex = texture2D(uMaps[1], vUv);
              break;
            case 2:
              tex = texture2D(uMaps[2], vUv);
              break;
            case 3:
              tex = texture2D(uMaps[3], vUv);
              break;
          }
          vec4 sampledDiffuseColor = tex;
          diffuseColor *= sampledDiffuseColor;
        `)
      }
    })

    iMesh = new InstancedMesh(geometry, material, COUNT)

    // const cscale = colorScale([Math.random() * 0xffffff, Math.random() * 0xffffff, Math.random() * 0xffffff, Math.random() * 0xffffff])
    // console.log(cscale.getColorAt(0.5))
    // for (let i = 0; i < COUNT; i++) {
    //   iMesh.setColorAt(i, cscale.getColorAt(i / COUNT))
    // }

    scene.add(iMesh)
  }

  /**
   */
  function initTextures (texturePosition, textureVelocity) {
    const posArray = texturePosition.image.data
    const velArray = textureVelocity.image.data
    for (let k = 0, kl = posArray.length; k < kl; k += 4) {
      posArray[k + 0] = rndFS(500)
      posArray[k + 1] = rndFS(500)
      posArray[k + 2] = rndFS(500)
      posArray[k + 3] = rnd(0.1, 1)

      velArray[k + 0] = 0 // rndFS(0.5)
      velArray[k + 1] = 0 // rndFS(0.5)
      velArray[k + 2] = 0 // rndFS(0.5)
      velArray[k + 3] = 0
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

function customGeometry (w, h) {
  const vertices = [
    { p: [0, 0, -h / 2], n: [0, 1, 0], uv: [0.5, 0] },
    { p: [0, 0, h / 2], n: [0, 1, 0], uv: [0.5, 1] },
    { p: [-w / 2, 0, -h / 2], n: [0, 1, 0], uv: [0, 0] },
    { p: [-w / 2, 0, h / 2], n: [0, 1, 0], uv: [0, 1] },
    { p: [w / 2, 0, -h / 2], n: [0, 1, 0], uv: [1, 0] },
    { p: [w / 2, 0, h / 2], n: [0, 1, 0], uv: [1, 1] }
  ]

  const indexes = [
    0, 2, 1,
    2, 3, 1,
    0, 1, 4,
    4, 1, 5
  ]

  const positions = []
  const normals = []
  const uvs = []
  for (const vertex of vertices) {
    positions.push(...vertex.p)
    normals.push(...vertex.n)
    uvs.push(...vertex.uv)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indexes)

  return geometry
}

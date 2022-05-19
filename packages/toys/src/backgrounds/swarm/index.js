import { AmbientLight, BoxGeometry, CapsuleGeometry, ConeGeometry, HalfFloatType, InstancedBufferAttribute, InstancedMesh, MathUtils, MeshStandardMaterial, OctahedronGeometry, Plane, PointLight, Raycaster, SphereGeometry, Vector3 } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import three from '../../three'
import { colorScale } from '../../tools/color'
import psrdnoise from '../../glsl/psrdnoise3.glsl'

const { randFloat: rnd, randFloatSpread: rndFS } = MathUtils

const defaultConfig = {
  gpgpuSize: 64,
  colors: [0x00ff00, 0x0000ff],
  color: 0xff0000
}

export default function (params) {
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

  let camera
  let geometry, material, iMesh

  const mousePlane = new Plane(new Vector3(0, 0, 1), 0)
  const mousePosition = new Vector3()
  const raycaster = new Raycaster()

  three({
    ...commonConfig(params),
    antialias: false,
    initRenderer ({ renderer }) {
      initGPU(renderer)
    },
    initCamera (three) {
      camera = three.camera
      camera.position.z = 100
    },
    initScene ({ scene }) {
      initScene(scene)
    },
    beforeRender ({ clock }) {
      uTime.value = clock.time * config.noiseTimeCoef
      uMouse.value.copy(mousePosition)

      gpu.compute()
      uTexturePosition.value = positionVariable.renderTargets[gpu.currentTextureIndex].texture
      uOldTexturePosition.value = positionVariable.renderTargets[gpu.currentTextureIndex === 0 ? 1 : 0].texture
      uTextureVelocity.value = velocityVariable.renderTargets[gpu.currentTextureIndex].texture
    },
    onPointerMove ({ nPosition }) {
      raycaster.setFromCamera(nPosition, camera)
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

        // vec3 grad;
        // float n = psrdnoise(pos.xyz * 0.1, vec3(0), 0.0, grad);
        // grad *= 0.001;
        // vel.xyz = vel.xyz + pos.w * (grad + 0.02 * normalize(uMouse - pos.xyz));

        // vel.xyz = vel.xyz + pos.w * 0.005 * normalize(uMouse - pos.xyz);
        // vel.xyz = clamp(vel.xyz, -0.25, 0.25);
        vel.xyz = vel.xyz + pos.w * 0.01 * normalize(uMouse - pos.xyz);
        vel.xyz = clamp(vel.xyz, -0.5, 0.5);
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
    scene.add(new AmbientLight(0xffffff, 0.25))

    const light1 = new PointLight(0xff9060, 0.75)
    light1.position.set(-100, -100, 0)
    scene.add(light1)

    const light2 = new PointLight(0x6090ff, 0.75)
    light2.position.set(100, 100, 0)
    scene.add(light2)

    // geometry = new CapsuleGeometry(0.2, 1, 4, 8).rotateX(Math.PI / 2)
    geometry = new ConeGeometry(0.2, 1, 6).rotateX(Math.PI / 2)
    // geometry = new BoxGeometry(0.5, 0.5, 0.5)
    // geometry = new OctahedronGeometry(1, 0).rotateX(Math.PI / 2)
    // geometry = new SphereGeometry(0.5, 8, 8)

    const gpuUvs = new Float32Array(COUNT * 2)
    let index = 0
    for (let j = 0; j < WIDTH; j++) {
      for (let i = 0; i < WIDTH; i++) {
        gpuUvs[index++] = i / (WIDTH - 1)
        gpuUvs[index++] = j / (WIDTH - 1)
      }
    }
    geometry.setAttribute('gpuUv', new InstancedBufferAttribute(gpuUvs, 2))

    material = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.75,
      roughness: 0.25,
      // flatShading: true,
      onBeforeCompile: shader => {
        Object.keys(uniforms).forEach(key => {
          shader.uniforms[key] = uniforms[key]
        })
        shader.vertexShader = `
          uniform sampler2D uTexturePosition;
          uniform sampler2D uOldTexturePosition;
          uniform sampler2D uTextureVelocity;
          uniform float uTime;
          attribute vec2 gpuUv;
          varying vec4 vPos;
          varying vec4 vVel;

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
        shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', `
          vPos = texture2D(uTexturePosition, gpuUv);
          vec4 oldPos = texture2D(uOldTexturePosition, gpuUv);
          vVel = texture2D(uTextureVelocity, gpuUv);

          mat3 rmat = lookAt(oldPos.xyz, vPos.xyz, vec3(0, 1, 0));
          mat4 im = iMatrix(vPos.xyz, rmat, 0.5 + vPos.w);

          vec3 transformedNormal = objectNormal;
          mat3 m = mat3(im);
          transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
          transformedNormal = m * transformedNormal;
          transformedNormal = normalMatrix * transformedNormal;
        `)
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vec4 mvPosition = modelViewMatrix * im * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        `)
      }
    })

    iMesh = new InstancedMesh(geometry, material, COUNT)

    const cscale = colorScale([Math.random() * 0xffffff, Math.random() * 0xffffff])
    console.log(cscale.getColorAt(0.5))
    for (let i = 0; i < COUNT; i++) {
      iMesh.setColorAt(i, cscale.getColorAt(i / COUNT))
    }

    scene.add(iMesh)
  }

  /**
   */
  function initTextures (texturePosition, textureVelocity) {
    const posArray = texturePosition.image.data
    const velArray = textureVelocity.image.data
    for (let k = 0, kl = posArray.length; k < kl; k += 4) {
      posArray[k + 0] = rndFS(100)
      posArray[k + 1] = rndFS(100)
      posArray[k + 2] = rndFS(100)
      posArray[k + 3] = rnd(0.1, 1)

      velArray[k + 0] = rndFS(0.2)
      velArray[k + 1] = rndFS(0.2)
      velArray[k + 2] = rndFS(0.2)
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

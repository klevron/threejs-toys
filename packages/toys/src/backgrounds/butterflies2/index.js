import { AmbientLight, BufferGeometry, Color, DirectionalLight, DoubleSide, Float32BufferAttribute, HalfFloatType, InstancedBufferAttribute, InstancedMesh, MathUtils, MeshPhongMaterial, MeshStandardMaterial, Object3D, Plane, PlaneGeometry, PointLight, Raycaster, TextureLoader, Vector3 } from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

import three from '../../three'
import { colorScale } from '../../tools/color'
import psrdnoise from '../../glsl/psrdnoise3.glsl'

const { randFloat: rnd, randFloatSpread: rndFS } = MathUtils

const defaultConfig = {
  gpgpuSize: 32,
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

  let camera
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
      camera.position.set(0, 50, 70)
    },
    initScene ({ renderer, width, height, camera, scene }) {
      initScene(scene)
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
        float n = psrdnoise(pos.xyz * 0.005, vec3(0), uTime * 0.5, grad);
        grad = grad * 0.0025;
        vel.xyz = vel.xyz + (pos.w + 0.5) * grad;
        // vel.xyz = clamp(vel.xyz, -0.1, 0.1);

        vec3 dv = -pos.xyz;
        float coef = smoothstep(100.0, 150.0, length(dv));
        vel.xyz = vel.xyz + pos.w * coef * normalize(dv);
        vel.xyz = clamp(vel.xyz, -0.1, 0.1);

        // vel.xyz = vel.xyz + pos.w * 0.005 * clamp(normalize(uMouse - pos.xyz), -0.5, 0.5);
        // vel.xyz = clamp(vel.xyz, -0.1, 0.1);
        // vel.xyz = vel.xyz + pos.w * 0.005 * normalize(uMouse - pos.xyz);
        // vel.xyz = clamp(vel.xyz, -0.25, 0.25);

        // vec3 dv = pos.xyz - uMouse;
        // float l = length(dv);
        // if (l < 20.0) {
        //   dv = 5.0 * normalize(dv);
        //   vel.xyz = vel.xyz + dv; 
        // }
        // vel.xyz = clamp(vel.xyz, -0.5, 0.5);

        vel.w = mod(vel.w + length(vel.xyz) * (0.5 + pos.w) * 0.75, 6.2831853071);
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
    scene.add(new AmbientLight(0xffffff, 0.5))

    const light = new DirectionalLight(0xffffff, 1)
    light.position.set(0, 10, 0)
    light.target = new Object3D()
    scene.add(light)
    scene.add(light.target)

    geometry = new PlaneGeometry(2, 2, 10, 10).rotateX(Math.PI / 2)

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

    material = new MeshStandardMaterial({
      map: tl.load('/b1.png'),
      side: DoubleSide,
      transparent: true,
      alphaTest: 0.5,
      metalness: 0,
      roughness: 1,
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

          mat4 iMatrix(vec3 pos, mat3 rmat, vec3 scale) {
            return mat4(
              rmat[0][0] * scale.x, rmat[0][1] * scale.x, rmat[0][2] * scale.x, 0.0,
              rmat[1][0] * scale.y, rmat[1][1] * scale.y, rmat[1][2] * scale.y, 0.0,
              rmat[2][0] * scale.z, rmat[2][1] * scale.z, rmat[2][2] * scale.z, 0.0,
              pos.x, pos.y, pos.z, 1.0
            );
          }
        ` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '')
        shader.vertexShader = shader.vertexShader.replace('#include <normal_vertex>', '')
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
          vPos = texture2D(uTexturePosition, gpuUv);
          vec4 oldPos = texture2D(uOldTexturePosition, gpuUv);
          vVel = texture2D(uTextureVelocity, gpuUv);
          vMapIndex = mapIndex;

          mat3 rmat = lookAt(oldPos.xyz, vPos.xyz, vec3(0, 1, 0));
          mat4 im = iMatrix(vPos.xyz, rmat, vec3(0.5 + vPos.w));

          vec3 transformedNormal = objectNormal;
          vec3 transformed = vec3(position);
          float dx = abs(transformed.x);
          if (dx > 0.0) {
            float sdx = smoothstep(0.0, 1.2, dx);
            float dy = transformed.z + 1.0;
            float sdy = smoothstep(0.0, 2.2, dy);
            transformed.y = sin(vVel.w - sdx + sdy) * sdx * 1.25;

            float s = sign(transformed.x);
            float sdx1 = smoothstep(0.0, 1.2, dx + 0.2);
            float sdy1 = smoothstep(0.0, 2.2, dy + s * 0.2);
            float dvy1 = sin(vVel.w - sdx + sdy1) * sdx * 1.25 - transformed.y;
            float dvy2 = sin(vVel.w - sdx1 + sdy) * sdx1 * 1.25 - transformed.y;
            vec3 v1 = vec3(0.0, dvy1, s * 0.2);
            vec3 v2 = vec3(s * 0.2, dvy2, 0.0);
            transformedNormal = -normalize(cross(v1, v2));
          }

          #ifdef USE_INSTANCING
            mat3 m = mat3( im );
            transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
            transformedNormal = m * transformedNormal;
          #endif
          transformedNormal = normalMatrix * transformedNormal;
          #ifdef FLIP_SIDED
            transformedNormal = - transformedNormal;
          #endif
          #ifdef USE_TANGENT
            vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
            #ifdef FLIP_SIDED
              transformedTangent = - transformedTangent;
            #endif
          #endif
          #ifndef FLAT_SHADED
            vNormal = normalize( transformedNormal );
            #ifdef USE_TANGENT
              vTangent = normalize( transformedTangent );
              vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
            #endif
          #endif
        `)

        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = im * mvPosition;
          #endif
          mvPosition = modelViewMatrix * mvPosition;
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

    // const cscale = colorScale([Math.random() * 0xffffff, Math.random() * 0xffffff])
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
      posArray[k + 0] = rndFS(150)
      posArray[k + 1] = rndFS(150)
      posArray[k + 2] = rndFS(150)
      posArray[k + 3] = rnd(0.1, 1)

      velArray[k + 0] = rndFS(0.5)
      velArray[k + 1] = rndFS(0.5)
      velArray[k + 2] = rndFS(0.5)
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

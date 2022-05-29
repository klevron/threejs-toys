import { ACESFilmicToneMapping, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector2, Vector3 } from 'three'

import three, { commonConfig, initLights } from '../../three'
import psrdnoise from '../../glsl/psrdnoise3.glsl'
import { colorScale } from '../../tools/color'

const { randFloat: rnd, randFloatSpread: rndFS } = MathUtils

const defaultConfig = {
  background: 0xffffff,
  nx: 400,
  ny: 400,
  dx: 0.05,
  dy: 0.05,
  colors: [Math.random() * 0xffffff, Math.random() * 0xffffff, Math.random() * 0xffffff],
  geometryScale: [1, 1, 1],
  lights: [
    { type: 'ambient', params: [0xffffff, 0.5] },
    { type: 'directional', params: [0xffffff, 1], props: { position: [-5, -10, 10] } }
    // { type: 'point', params: [0xffffff, 1], props: { position: [10, 10, 10] } },
    // { type: 'point', params: [0xff9060, 0.75], props: { position: [-100, -100, 100] } },
    // { type: 'point', params: [0x6090ff, 0.75], props: { position: [100, 100, 100] } }
  ],
  materialParams: {},
  noiseCoordScale: 0.01,
  noiseIntensity: 0.0025,
  noiseTimeCoef: 0.001
}

export default function (params) {
  const config = { ...defaultConfig, ...params }

  const COUNT = config.nx * config.ny

  const uScale = { value: new Vector3(...config.geometryScale) }
  const uTime = { value: 0 }
  const uNoiseCoordScale = { value: config.noiseCoordScale }
  const uNoiseIntensity = { value: config.noiseIntensity }
  const uMaxVelocity = { value: config.maxVelocity }
  const uMouse = { value: new Vector3() }

  const uniforms = { uScale, uTime, uNoiseCoordScale, uNoiseIntensity, uMaxVelocity, uMouse }

  let camera
  let geometry, material, iMesh

  // const mousePlane = new Plane(new Vector3(0, 0, 1), 0)
  // const mousePosition = new Vector3()
  // const raycaster = new Raycaster()

  const _three = three({
    ...commonConfig(params),
    antialias: true,
    orbitControls: true,
    initCamera (three) {
      camera = three.camera
      camera.position.z = 5
    },
    initScene ({ renderer, width, height, camera, scene }) {
      renderer.toneMapping = ACESFilmicToneMapping
      initScene(scene)
    },
    beforeRender ({ clock }) {
      uTime.value = clock.time * config.noiseTimeCoef
      // uMouse.value.copy(mousePosition)
    }
    // onPointerMove ({ nPosition }) {
    //   raycaster.setFromCamera(nPosition, camera)
    //   camera.getWorldDirection(mousePlane.normal)
    //   raycaster.ray.intersectPlane(mousePlane, mousePosition)
    // },
    // onPointerLeave () {
    //   mousePosition.set(0, 0, 0)
    // }
  })

  return { three: _three, config, uniforms }

  /**
   */
  function initScene (scene) {
    if (config.background !== undefined) {
      scene.background = new Color(config.background)
    }

    initLights(scene, config.lights)

    // const plane = new Mesh(
    //   new PlaneGeometry(config.nx * config.dx, config.ny * config.dy, 1, 1),
    //   new MeshStandardMaterial({ color: 0x008800, metalness: 0, roughness: 1 })
    // )
    // scene.add(plane)

    geometry = customGeometry(0.05)
    material = new MeshStandardMaterial({
      side: DoubleSide,
      vertexColors: true,
      metalness: 0,
      roughness: 1,
      onBeforeCompile: (shader) => {
        shader.uniforms.uTime = uTime
        shader.vertexShader = `
          uniform float uTime;
          ${psrdnoise}
        ` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', `
          float noiseCoordScale = 0.2;
          float displacementScale = 0.075;

          vec4 mvPosition = vec4( position, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif

          vec3 transformedNormal;

          if (position.z > 0.0) {
            vec3 grad;
            float d = psrdnoise(mvPosition.xyz * noiseCoordScale + uTime * vec3(-0.2, -0.1, 0.0), vec3(0.0), uTime, grad);
            // grad.z = 0.0;
            // transformed.xy += grad.xy * position.z * displacementScale;
            mvPosition.xyz += grad * position.z * displacementScale;

            grad *= noiseCoordScale;
            vec3 N_ = grad - dot(grad, normal) * normal;
            transformedNormal = normal - displacementScale * N_;
            transformedNormal = normalize(transformedNormal);
          } else {
            transformedNormal = objectNormal;
          }

          // vec3 transformedNormal = objectNormal;
          #ifdef USE_INSTANCING
            mat3 m = mat3( instanceMatrix );
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

          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
        `)
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '')
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '')
      }
    })
    iMesh = new InstancedMesh(geometry, material, COUNT)
    scene.add(iMesh)

    const points = getFibonacciSpherePoints(COUNT, 5, true)
    const dummy = new Object3D()
    for (let i = 0; i < COUNT; i++) {
      dummy.position.copy(points[i])
      dummy.lookAt(dummy.position.clone().multiplyScalar(2))
      // dummy.rotation.set(rndFS(0.5), rndFS(0.5), rndFS(Math.PI))
      dummy.scale.set(1, 1, 0.25 + Math.random() * 0.25)
      dummy.rotateZ(rndFS(Math.PI))
      dummy.rotateX(rndFS(0.5))
      dummy.rotateY(rndFS(0.5))
      dummy.updateMatrix()
      iMesh.setMatrixAt(i, dummy.matrix)
    }

    const sphere = new Mesh(
      new SphereGeometry(5, 16, 16),
      new MeshBasicMaterial({ color: 0x004000 })
    )
    scene.add(sphere)

    // for (let i = 0; i < config.nx; i++) {
    //   for (let j = 0; j < config.ny; j++) {
    //     const x = i * config.dx - (0.5 * config.nx * config.dx) + 0.5 * Math.random() * config.dx
    //     const y = j * config.dy - (0.5 * config.ny * config.dy) + 0.5 * Math.random() * config.dy
    //     dummy.position.set(x, y, 0)
    //     dummy.rotation.set(rndFS(0.5), rndFS(0.5), rndFS(Math.PI))
    //     dummy.scale.set(1, 1, 0.5 + Math.random() * 0.5)
    //     dummy.updateMatrix()
    //     iMesh.setMatrixAt(i * config.ny + j, dummy.matrix)
    //   }
    // }

    // setColors([Math.random() * 0xffffff, Math.random() * 0xffffff])
  }

  /**
   */
  function setColors (colors) {
    if (Array.isArray(colors) && colors.length > 1) {
      const cscale = colorScale(colors)
      for (let i = 0; i < COUNT; i++) {
        iMesh.setColorAt(i, cscale.getColorAt(Math.random()))
      }
      iMesh.instanceColor.needsUpdate = true
    }
  }
}

function customGeometry (size) {
  const vertices = [
    { p: [size * 0.5, 0, 0], n: [0, 1, 0], c: [0, 0.5, 0] },
    { p: [-size * 0.5, 0, 0], n: [0, 1, 0], c: [0, 0.5, 0] },
    { p: [0, 0, size * 20], n: [0, 1, 0], c: [0.5, 1, 0.5] }
  ]

  const indexes = [0, 1, 2]

  const positions = []
  const normals = []
  const colors = []
  for (const vertex of vertices) {
    positions.push(...vertex.p)
    normals.push(...vertex.n)
    colors.push(...vertex.c)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indexes)

  return geometry
}

function getFibonacciSpherePoints (samples, radius, randomize) {
  samples = samples || 1
  radius = radius || 1
  randomize = randomize || true
  let random = 1
  if (randomize) {
    random = Math.random() * samples
  }
  const points = []
  const offset = 2 / samples
  const increment = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < samples; i++) {
    let y = ((i * offset) - 1) + (offset / 2)
    const distance = Math.sqrt(1 - Math.pow(y, 2))
    const phi = ((i + random) % samples) * increment
    let x = Math.cos(phi) * distance
    let z = Math.sin(phi) * distance
    x = x * radius
    y = y * radius
    z = z * radius
    points.push({ x, y, z })
  }
  return points
}

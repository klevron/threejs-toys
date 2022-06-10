import { ACESFilmicToneMapping, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Plane, PlaneGeometry, Raycaster, SphereGeometry, TextureLoader, Vector2, Vector3 } from 'three'

import three, { commonConfig, initLights } from '../../three'
import psrdnoise from '../../glsl/psrdnoise3.glsl'
import { colorScale } from '../../tools/color'

const { randFloatSpread: rndFS } = MathUtils

const defaultConfig = {
  // background: 0x0191EB,
  background: 0xffffff,
  nx: 300,
  ny: 300,
  dx: 0.05,
  dy: 0.05,
  colors: [Math.random() * 0xffffff, Math.random() * 0xffffff, Math.random() * 0xffffff],
  geometryScale: [1, 1, 1],
  lights: [
    { type: 'ambient', params: [0xffffff, 0.5] },
    { type: 'directional', params: [0xffffff, 1], props: { position: [0, 0, 10] } }
    // { type: 'point', params: [0xffffff, 1], props: { position: [10, 10, 10] } },
    // { type: 'point', params: [0xff9060, 0.75], props: { position: [-100, -100, 100] } },
    // { type: 'point', params: [0x6090ff, 0.75], props: { position: [100, 100, 100] } }
  ],
  materialParams: {},
  noiseCoordScale: 0.2,
  noiseDisplacementScale: 0.075,
  noiseTimeCoef: 0.001
}

export default function (params) {
  const config = { ...defaultConfig, ...params }

  const COUNT = config.nx * config.ny

  const uTime = { value: 0 }
  const uScale = { value: new Vector3(...config.geometryScale) }
  const uNoiseCoordScale = { value: config.noiseCoordScale }
  const uNoiseDisplacementScale = { value: config.noiseDisplacementScale }
  const uMouse = { value: new Vector3() }

  const uniforms = { uTime, uScale, uNoiseCoordScale, uNoiseDisplacementScale, uMouse }

  let camera
  let geometry, material, iMesh

  let sphere
  const mousePlane = new Plane(new Vector3(0, 0, 1), 0)
  const mousePosition = new Vector3()
  const raycaster = new Raycaster()

  const _three = three({
    ...commonConfig(params),
    antialias: true,
    orbitControls: true,
    initCamera (three) {
      camera = three.camera
      camera.position.z = 15
    },
    initScene ({ renderer, width, height, camera, scene }) {
      renderer.toneMapping = ACESFilmicToneMapping
      initScene(scene)
    },
    beforeRender ({ clock }) {
      uTime.value = clock.time * config.noiseTimeCoef
      uMouse.value.lerp(mousePosition, 0.05)
    },
    onPointerMove ({ nPosition }) {
      raycaster.setFromCamera(nPosition, camera)
      const intersects = raycaster.intersectObject(sphere)
      if (intersects.length) mousePosition.copy(intersects[0].point)
      else mousePosition.set(0, 0, 0)
      // camera.getWorldDirection(mousePlane.normal)
      // raycaster.ray.intersectPlane(mousePlane, mousePosition)
    },
    onPointerLeave () {
      mousePosition.set(0, 0, 0)
    }
  })

  return { three: _three, config, uniforms, setColors }

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

    const rotz = []
    for (let i = 0; i < COUNT; i++) {
      rotz[i] = rndFS(2 * Math.PI)
    }
    geometry.setAttribute('rotz', new Float32BufferAttribute(rotz, 1))

    material = new MeshStandardMaterial({
      side: DoubleSide,
      vertexColors: true,
      metalness: 0,
      roughness: 1,
      onBeforeCompile: (shader) => {
        shader.uniforms.uTime = uTime
        shader.uniforms.uNoiseCoordScale = uNoiseCoordScale
        shader.uniforms.uNoiseDisplacementScale = uNoiseDisplacementScale
        shader.uniforms.uMouse = uMouse
        shader.vertexShader = `
          uniform float uTime;
          uniform float uNoiseCoordScale;
          uniform float uNoiseDisplacementScale;
          uniform vec3 uMouse;
          attribute float rotz;
          ${psrdnoise}
        ` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', `
          vec4 mvPosition = instanceMatrix * vec4( position, 1.0 );

          vec3 transformedNormal = objectNormal;
          if (position.z > 0.0) {
            vec3 grad;
            float d = psrdnoise(mvPosition.xyz * uNoiseCoordScale + uTime * vec3(0.2, 0.3, 0.0), vec3(0.0), uTime, grad);
            // grad.z = 0.0;
            mvPosition.xyz += grad * uNoiseDisplacementScale;

            vec3 mouseRepulsion = mvPosition.xyz - (uMouse * 1.15);
            mouseRepulsion *= smoothstep(2.0, 0.0, length(mouseRepulsion)) * 0.75;
            mvPosition.xyz += mouseRepulsion;

            vec3 v1 = (mvPosition - instanceMatrix * vec4(1.0, 0.0, 0.0, 1.0)).xyz;
            vec3 v2 = (mvPosition - instanceMatrix * vec4(-1.0, 0.0, 0.0, 1.0)).xyz;
            transformedNormal = normalize(cross(v1, v2)); 
          } else {
            transformedNormal = objectNormal;
            mat3 m = mat3( instanceMatrix );
            transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
            transformedNormal = m * transformedNormal;
          }

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
      dummy.rotateZ(rotz[i])
      dummy.rotateX(rndFS(0.5))
      dummy.rotateY(rndFS(0.5))
      dummy.updateMatrix()
      iMesh.setMatrixAt(i, dummy.matrix)
    }

    sphere = new Mesh(
      new SphereGeometry(5, 16, 16),
      new MeshBasicMaterial({ color: 0x008000 })
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

    // initFlowers(scene)
  }

  // function initFlowers (scene) {
  //   const geometry = new PlaneGeometry(0.25, 0.25, 1, 1)
  //   material = new MeshStandardMaterial({
  //     map: new TextureLoader().load('/flower.png'),
  //     transparent: true,
  //     onBeforeCompile: (shader) => {
  //       shader.uniforms.uTime = uTime
  //       shader.uniforms.uNoiseCoordScale = uNoiseCoordScale
  //       shader.uniforms.uNoiseDisplacementScale = uNoiseDisplacementScale
  //       shader.uniforms.uMouse = uMouse
  //       shader.vertexShader = `
  //         uniform float uTime;
  //         uniform float uNoiseCoordScale;
  //         uniform float uNoiseDisplacementScale;
  //         uniform vec2 uMouse;
  //         ${psrdnoise}
  //       ` + shader.vertexShader
  //       shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', `
  //         mat4 im = instanceMatrix;
  //         vec3 pos = instanceMatrix[3].xyz;

  //         vec3 grad;
  //         float d = psrdnoise(pos * uNoiseCoordScale + uTime * vec3(uMouse, 0.0), vec3(0.0), uTime, grad);
  //         pos += grad * uNoiseDisplacementScale;
  //         im[3].xyz = pos;

  //         vec4 mvPosition = vec4( position, 1.0 );
  //         #ifdef USE_INSTANCING
  //           mvPosition = im * mvPosition;
  //         #endif

  //         vec3 transformedNormal = objectNormal;
  //         #ifdef USE_INSTANCING
  //           mat3 m = mat3( im );
  //           transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
  //           transformedNormal = m * transformedNormal;
  //         #endif
  //         transformedNormal = normalMatrix * transformedNormal;
  //         #ifdef FLIP_SIDED
  //           transformedNormal = - transformedNormal;
  //         #endif
  //         #ifdef USE_TANGENT
  //           vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
  //           #ifdef FLIP_SIDED
  //             transformedTangent = - transformedTangent;
  //           #endif
  //         #endif

  //         mvPosition = modelViewMatrix * mvPosition;
  //         gl_Position = projectionMatrix * mvPosition;
  //       `)
  //       shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '')
  //       shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '')
  //     }
  //   })
  //   const iMeshFlowers = new InstancedMesh(geometry, material, COUNT)
  //   scene.add(iMeshFlowers)

  //   const points = getFibonacciSpherePoints(1000, 5.5, true)
  //   const dummy = new Object3D()
  //   for (let i = 0; i < 1000; i++) {
  //     dummy.position.copy(points[i])
  //     dummy.lookAt(dummy.position.clone().multiplyScalar(2))
  //     // dummy.rotation.set(rndFS(0.5), rndFS(0.5), rndFS(Math.PI))
  //     // dummy.scale.set(1, 1, 0.25 + Math.random() * 0.25)
  //     dummy.rotateZ(rndFS(Math.PI))
  //     dummy.rotateX(rndFS(0.5))
  //     dummy.rotateY(rndFS(0.5))
  //     dummy.updateMatrix()
  //     iMeshFlowers.setMatrixAt(i, dummy.matrix)
  //   }
  // }

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
    { p: [0, 0, size * 20], n: [0, 1, 0], c: [0.25, 1, 0.25] }
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

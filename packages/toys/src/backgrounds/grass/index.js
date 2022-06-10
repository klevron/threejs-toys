import { BufferGeometry, CubeTextureLoader, DirectionalLight, DoubleSide, Float32BufferAttribute, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Plane, PlaneGeometry, Raycaster, RepeatWrapping, TextureLoader, Vector2, Vector3 } from 'three'
import SimplexNoise from 'simplex-noise'

import threeWrapper, { commonConfig, initLights } from '../../three'
import psrdnoise from '../../glsl/psrdnoise2.glsl'
import { colorScale } from '../../tools/color'

export default function (params) {
  const config = {
    background: null,
    count: 40000,
    colors: [0xD9C2A0, 0x5C961D],
    lights: [
      { type: 'ambient', params: [0xffffff, 0.5] }
    ],
    groundWidth: 20,
    groundHeight: 20,
    groundCoordScale: 0.1,
    groundDisplacementScale: 1,
    groundMaterialParams: {},
    geometryScale: [1, 1, 1],
    materialParams: {},
    noiseCoordScale: 0.1,
    noiseDisplacementScale: 0.5,
    noiseTimeCoef: 0.002,
    ...params
  }

  const loader = new TextureLoader()

  const simplex = new SimplexNoise()
  let simplexDx = 0
  let simplexDy = 0

  const { randFloatSpread: rndFS } = MathUtils

  const COUNT = config.count

  const uTime = { value: 0 }
  const uScale = { value: new Vector3(...config.geometryScale) }
  const uNoiseCoordScale = { value: config.noiseCoordScale }
  const uNoiseDisplacementScale = { value: config.noiseDisplacementScale }
  const uMouse = { value: new Vector3() }

  const uniforms = { uTime, uScale, uNoiseCoordScale, uNoiseDisplacementScale, uMouse }

  let camera, light

  const group = new Object3D()

  let groundGeo
  let ground

  let geometry, material, iMesh

  const dummyV = new Vector3()

  const three = threeWrapper({
    ...commonConfig(params),
    antialias: true,
    orbitControls: { target: new Vector3(0, 1.6, 0) },
    initCamera (three) {
      camera = three.camera
      camera.position.set(0, 1.6, 4)
      // camera.lookAt(0, 1.6, 0)
    },
    initScene ({ scene }) {
      initScene(scene)
      document.body.addEventListener('click', () => {
        config.colors = [Math.random() * 0xffffff, Math.random() * 0xffffff]
        displaceGround()
        updateGrassPosition()
      })
    },
    beforeRender ({ clock, controllers }) {
      uTime.value = clock.time * config.noiseTimeCoef
      // uMouse.value.lerp(mousePosition, 0.05)
    }
  })

  return { three, config, uniforms }

  /**
   */
  async function initScene (scene) {
    if (config.background) scene.background = config.background

    initLights(scene, config.lights)

    // const hlight = new HemisphereLight(0xffffbb, 0x080820, 1)
    // scene.add(hlight)

    light = new DirectionalLight(0xffffff, 1)
    light.position.set(-10, 7.5, -10)
    light.target.position.set(0, 0, 0)
    group.add(light)
    group.add(light.target)

    groundGeo = new PlaneGeometry(config.groundWidth, config.groundHeight, 32, 32)
    displaceGround()

    ground = new Mesh(groundGeo, new MeshStandardMaterial({ color: 0xffffff, ...config.groundMaterialParams }))
    ground.rotation.x = -Math.PI / 2
    group.add(ground)

    geometry = customGeometry(0.02, 0.75)

    material = new MeshBasicMaterial({
      side: DoubleSide,
      vertexColors: true,
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
          ${psrdnoise}
        ` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '')
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vec4 mvPosition = instanceMatrix * vec4( position, 1.0 );
          vec3 transformed = position;

          if (position.z > 0.0) {
            vec2 grad;
            float d = psrdnoise(mvPosition.xy * uNoiseCoordScale + uTime * vec2(0.2, 0.3), vec2(0.0), uTime, grad);
            grad *= uNoiseCoordScale;
            transformed = normalize(vec3(grad * uNoiseDisplacementScale, 1.0)) * position.z;
            mvPosition.xyz = vec3(mvPosition.xy, mvPosition.z - position.z) + transformed;

            // vec3 mouse = uMouse; mouse.z = 0.25;
            // vec3 mouseRepulsion = mvPosition.xyz - mouse;
            // mouseRepulsion *= smoothstep(2.0, 0.0, length(mouseRepulsion)) * 1.5;
            // mvPosition.xyz += mouseRepulsion;
          }

          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
        `)
      }
    })

    iMesh = new InstancedMesh(geometry, material, COUNT)
    iMesh.rotation.x = -Math.PI / 2
    group.add(iMesh)

    updateGrassPosition()

    // setColors(config.colors)
    scene.add(group)
  }

  function displaceGround () {
    simplexDx = Math.random() * config.groundWidth
    simplexDy = Math.random() * config.groundHeight
    const vertices = groundGeo.attributes.position.array
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      const noise = 0.5 * (1 + simplex.noise2D(x * config.groundCoordScale + simplexDx, y * config.groundCoordScale + simplexDy))
      vertices[i + 2] = noise * config.groundDisplacementScale
    }
    groundGeo.attributes.position.needsUpdate = true
    groundGeo.computeVertexNormals()
  }

  function updateGrassPosition () {
    const cscale = colorScale(config.colors)
    const dummy = new Object3D()
    let index = 0
    while (index < COUNT) {
      const x = rndFS(1) * config.groundWidth
      const y = rndFS(1) * config.groundHeight
      const gnoise = 0.5 * (1 + simplex.noise2D(x * config.groundCoordScale + simplexDx, y * config.groundCoordScale + simplexDy))
      const noise = 0.5 * (1 + simplex.noise2D(x * 0.25 + simplexDx, y * 0.25 + simplexDy))
      if (noise < 0.6) continue
      dummy.position.set(x, y, gnoise * config.groundDisplacementScale)
      dummy.rotation.set(0, 0, rndFS(Math.PI / 2))
      const scale = (noise - 0.3) / 0.7
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()
      iMesh.setMatrixAt(index, dummy.matrix)
      iMesh.setColorAt(index, cscale.getColorAt((noise - 0.4) / 0.6))
      index++
    }
    iMesh.instanceMatrix.needsUpdate = true
    iMesh.instanceColor.needsUpdate = true
  }
}

function customGeometry (w, h) {
  const vertices = [
    { p: [w, 0, 0], n: [0, 1, 0], c: [1, 223 / 255, 173 / 255] },
    { p: [-w, 0, 0], n: [0, 1, 0], c: [1, 223 / 255, 173 / 255] },
    { p: [0, 0, h], n: [0, 1, 0], c: [1, 1, 1] }
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

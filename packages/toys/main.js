import './style.css'

import { Pane } from 'tweakpane'

import { CubeTextureLoader, RepeatWrapping, TextureLoader } from 'three'
import background from './src/backgrounds/grass'

(async function () {
  const loader = new TextureLoader()
  const cloader = new CubeTextureLoader()

  cloader.setPath('https://assets.codepen.io/33787/')
  const cubeTexture = cloader.load([
    'skyboxsun25deg_px.jpg', 'skyboxsun25deg_nx.jpg',
    'skyboxsun25deg_py.jpg', 'skyboxsun25deg_ny.jpg',
    'skyboxsun25deg_pz.jpg', 'skyboxsun25deg_nz.jpg'
  ])

  const map = await loader.loadAsync('https://assets.codepen.io/33787/Sand_004_COLOR.jpg')
  const bumpMap = await loader.loadAsync('https://assets.codepen.io/33787/Sand_004_Height.jpg')
  const normalMap = await loader.loadAsync('https://assets.codepen.io/33787/Sand_004_Normal.jpg')

  map.wrapS = map.wrapT = RepeatWrapping
  map.repeat.set(2, 2)
  bumpMap.wrapS = bumpMap.wrapT = RepeatWrapping
  bumpMap.repeat.set(2, 2)
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping
  normalMap.repeat.set(2, 2)

  const bg = background({
    el: document.getElementById('app'),
    eventsEl: document.body,
    background: cubeTexture,
    groundMaterialParams: { map, bumpMap, normalMap, normalScale: { x: 0.25, y: 0.25 } }
  })
})()

// import background from './src/backgrounds/grass'
// const bg = background({
//   el: document.getElementById('app'),
//   eventsEl: document.body,
//   materialParams: {}
// })

// import background from './src/backgrounds/swarm'
// const bg = background({
//   el: document.getElementById('app'),
//   eventsEl: document.body,
//   gpgpuSize: 256,
//   geometry: 'default',
//   materialParams: {}
// })

// bg.three.camera.position.set(0, 0, 250)

// document.body.addEventListener('click', () => {
//   bg.setColors([Math.random() * 0xffffff, Math.random() * 0xffffff, Math.random() * 0xffffff])
// })

// import background from './src/backgrounds/fishes'
// const bg = background({
//   el: document.getElementById('app'),
//   eventsEl: document.body,
//   gpgpuSize: 64,
//   background: 0x031F48,
//   fogDensity: 0.025,
//   texture: '/fishes.png',
//   textureCount: 8,
//   material: 'phong',
//   materialParams: {
//     transparent: true,
//     alphaTest: 0.5,
//     // shininess: 100
//   },
//   fishScale: [1.5, 1.5, 1.5]
// })

// import background from './src/backgrounds/butterflies'
// const bg = background({
//   el: document.getElementById('app'),
//   eventsEl: document.body,
//   gpgpuSize: 64,
//   background: 0xffffff,
//   texture: '/butterflies.png',
//   textureCount: 4,
//   material: 'phong',
//   materialParams: {
//     transparent: true,
//     alphaTest: 0.5,
//     shininess: 10
//   },
//   wingsScale: [1.5, 1.5, 1.5],
//   // wingsWidthSegments: 6,
//   // wingsHeightSegments: 6
// })

// document.body.addEventListener('click', () => {
//   bg.setColors([Math.random() * 0xffffff, Math.random() * 0xffffff, Math.random() * 0xffffff])
// })

// const pane = new Pane()
// pane.addInput(bg.uniforms.uCoordScale, 'value', { min: 0.0001, max: 10, step: 0.01 })
// pane.addInput(bg.uniforms.uNoiseIntensity, 'value', { min: 0.00001, max: 0.005, step: 0.00005 })
// pane.addInput(bg.uniforms.uPointSize, 'value', { min: 1, max: 10, step: 0.1 })
// pane.addInput({ color: bg.uniforms.uColor.value.getHex() }, 'color', { view: 'color' }).on('change', (ev) => {
//   bg.uniforms.uColor.value.set(ev.value)
// })

// import background from './src/cursors/neon-cursor'

// import background from './src/backgrounds/noisy-plane'

// const bg = background({
//   el: document.getElementById('app'),
//   // pointerOptions: { domElement: document.body }
// })

// document.body.addEventListener('click', () => {
//   bg.config.colors = [Math.round(Math.random() * 0xffffff), Math.round(Math.random() * 0xffffff)]
//   bg.config.minStroke = Math.random() * 20
//   bg.config.maxStroke = bg.config.minStroke + Math.random() * 30
//   bg.drawTexture()

//   bg.config.timeCoef = 0.000025 + Math.random() * 0.0005
//   bg.uniforms.uCoordScale1.value = 0.5 + Math.random() * 9.5
//   bg.uniforms.uCoordScale2.value = 0.5 + Math.random() * 9.5
//   bg.uniforms.uDisplacementScale.value = 0.01 + Math.random() * 0.05

//   bg.material.color.set(Math.random() * 0xffffff)
// })





// import background from './src/backgrounds/noisy-lines'

// const bg = background({
//   el: document.getElementById('app'),
//   colors: [143811, 10932726],
//   minStroke: 0.5,
//   maxStroke: 2,
//   timeCoef: 0.0002,
//   coordScale: 2,
//   displacementScale: 0.02
// })

// document.body.addEventListener('click', () => {
//   bg.config.colors = [Math.round(Math.random() * 0xffffff), Math.round(Math.random() * 0xffffff), Math.round(Math.random() * 0xffffff)]
//   bg.config.minStroke = Math.random() * 2
//   bg.config.maxStroke = bg.config.minStroke + Math.random() * 5
//   bg.drawTexture()

//   // bg.config.timeCoef = 0.000025 + Math.random() * 0.001
//   // bg.uniforms.uCoordScale.value = 0.5 + Math.random() * 4.5
//   // bg.uniforms.uDisplacementScale.value = 0.00025 + Math.random() * 0.01
// })

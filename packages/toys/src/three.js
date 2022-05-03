import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer
} from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import pointer from './pointer'

export default function (params) {
  const options = {
    alpha: false,
    antialias: false,
    // pointer: false,
    init () {},
    initCamera () {},
    initScene () {},
    afterResize () {},
    beforeRender () {},
    // onPointerEnter () {},
    // onPointerMove () {},
    // onPointerLeave () {},
    ...params
  }

  const three = {
    renderer: null,
    camera: null,
    scene: null,
    pointer: null,
    width: 0,
    height: 0,
    wWidth: 0,
    wHeight: 0,
    clock: {
      startTime: 0,
      time: 0,
      elapsed: 0
    }
  }

  let cameraCtrl

  init()

  return three

  function init () {
    const canvas = document.createElement('canvas')
    options.el.appendChild(canvas)

    options.init?.(three)

    three.renderer = new WebGLRenderer({ canvas, alpha: options.alpha, antialias: options.antialias })
    options.initRenderer?.(three)

    three.camera = new PerspectiveCamera()
    three.camera.position.z = 50
    options.initCamera?.(three)

    // cameraCtrl = new OrbitControls(three.camera, three.renderer.domElement)
    cameraCtrl = new OrbitControls(three.camera, document.body)
    cameraCtrl.enableDamping = true
    cameraCtrl.dampingFactor = 0.1

    resize()
    window.addEventListener('resize', resize)

    three.scene = new Scene()
    options.initScene?.(three)

    initPointer()

    requestAnimationFrame(timestamp => {
      three.clock.startTime = three.clock.time = timestamp
      requestAnimationFrame(animate)
    })
  }

  function initPointer () {
    // if (!options.pointer) return
    const pointerOptions = {}
    if (options.onPointerEnter) { pointerOptions.onEnter = options.onPointerEnter }
    if (options.onPointerMove) { pointerOptions.onMove = options.onPointerMove }
    if (options.onPointerMove) { pointerOptions.onLeave = options.onPointerLeave }
    if (Object.keys(pointerOptions).length > 0) {
      three.pointer = pointer({ domElement: options.el, ...pointerOptions })
    }
  }

  function animate (timestamp) {
    const { clock } = three
    clock.elapsed = timestamp - clock.time
    clock.time = timestamp

    options.beforeRender(three)

    if (cameraCtrl) cameraCtrl.update()

    three.renderer.render(three.scene, three.camera)
    requestAnimationFrame(animate)
  }

  function resize () {
    const parent = three.renderer.domElement.parentElement
    three.width = parent.clientWidth
    three.height = parent.clientHeight
    three.renderer.setSize(three.width, three.height)
    three.camera.aspect = three.width / three.height
    three.camera.updateProjectionMatrix()
    if (three.camera instanceof PerspectiveCamera) {
      const wsize = getCameraViewSize()
      three.wWidth = wsize[0]; three.wHeight = wsize[1]
    } else {
      three.wWidth = three.camera.top - three.camera.bottom
      three.wHeight = three.camera.right - three.camera.left
    }
    options.afterResize?.(three)
  }

  function getCameraViewSize () {
    const vFOV = (three.camera.fov * Math.PI) / 180
    const h = 2 * Math.tan(vFOV / 2) * Math.abs(three.camera.position.z)
    const w = h * three.camera.aspect
    return [w, h]
  }
}

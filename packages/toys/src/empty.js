import threeWrapper, { commonConfig, initLights } from '../three'

const defaultConfig = {
  lights: []
}

export default function (params) {
  const config = { ...defaultConfig, ...params }

  const three = threeWrapper({
    ...commonConfig(params),
    antialias: false,
    initScene,
    afterResize,
    beforeRender,
    onPointerMove,
    onPointerLeave
  })

  function initScene ({ scene }) {
    initLights(scene, config.lights)
  }

  function afterResize ({ width, height }) {}
  function beforeRender ({ clock, width, height, wWidth, wHeight }) {}
  function onPointerMove ({ position, nPosition, delta }) {}
  function onPointerLeave () {}

  return { three, config }
}

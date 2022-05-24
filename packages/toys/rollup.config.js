import esbuild from 'rollup-plugin-esbuild'
import glsl from 'rollup-plugin-glsl'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'

function createConfig (format, outputFile, external, plugins = [], minify = false) {
  return {
    input: 'src/export.js',
    external,
    output: {
      file: outputFile,
      format,
      sourcemap: true
    },
    plugins: [
      ...plugins,
      glsl({
        include: 'src/glsl/**/*.glsl'
      }),
      esbuild({
        minify,
        target: 'es2019'
      })
    ]
  }
}

const threeCdn = 'https://unpkg.com/three@0.140.0/build/three.module.js'

const cdnReplaces = {
  'from \'three\'': `from '${threeCdn}'`,
  delimiters: ['', '']
}

const external = [
  'three',
  'three/examples/jsm/misc/GPUComputationRenderer.js',
  'three/examples/jsm/controls/OrbitControls.js',
  'three/examples/jsm/postprocessing/EffectComposer.js',
  'three/examples/jsm/postprocessing/RenderPass.js',
  'three/examples/jsm/postprocessing/UnrealBloomPass.js'
]

export default [
  createConfig('es', 'build/threejs-toys.module.js', external, [], false),
  createConfig('es', 'build/threejs-toys.module.min.js', external, [], true),
  createConfig('es', 'build/threejs-toys.module.cdn.js', [threeCdn], [nodeResolve(), replace(cdnReplaces)], false),
  createConfig('es', 'build/threejs-toys.module.cdn.min.js', [threeCdn], [nodeResolve(), replace(cdnReplaces)], true)
]

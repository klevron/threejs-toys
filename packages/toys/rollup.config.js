import esbuild from 'rollup-plugin-esbuild'
import glsl from 'rollup-plugin-glsl'
import replace from '@rollup/plugin-replace'

const external = [
  'three'
]

const cdnReplaces = {
  'from \'three\'': 'from \'https://unpkg.com/three@0.140.0/build/three.module.js\'',
  delimiters: ['', '']
}

function createConfig (format, outputFile, plugins = [], minify = false) {
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

export default [
  createConfig('es', 'build/threejs-toys.module.js', [], false),
  createConfig('es', 'build/threejs-toys.module.min.js', [], true),
  createConfig('es', 'build/threejs-toys.module.cdn.js', [replace(cdnReplaces)], false),
  createConfig('es', 'build/threejs-toys.module.cdn.min.js', [replace(cdnReplaces)], true)
]

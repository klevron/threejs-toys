import esbuild from 'rollup-plugin-esbuild'

function createConfig (format, outputFile, plugins = [], minify = false) {
  return {
    input: 'src/export.js',
    output: {
      file: outputFile,
      format,
      sourcemap: true
    },
    plugins: [
      ...plugins,
      esbuild({
        minify,
        target: 'es2019'
      })
    ]
  }
}

export default [
  createConfig('es', 'build/threejs-toys.module.js', [], false),
  createConfig('es', 'build/threejs-toys.module.min.js', [], true)
]

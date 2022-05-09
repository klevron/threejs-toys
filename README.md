# ✨ ThreeJS Toys - Made with 💙

[![NPM Package][npm]][npm-url]
[![Build Size][build-size]][build-size-url]
[![NPM Downloads][npm-downloads]][npmtrends-url]
[![Twitter][twitter]][twitter-url]

[npm]: https://img.shields.io/npm/v/threejs-toys
[npm-url]: https://www.npmjs.com/package/threejs-toys
[build-size]: https://badgen.net/bundlephobia/minzip/threejs-toys
[build-size-url]: https://bundlephobia.com/result?p=threejs-toys
[npm-downloads]: https://img.shields.io/npm/dw/threejs-toys
[npmtrends-url]: https://www.npmtrends.com/threejs-toys
[twitter]: https://img.shields.io/twitter/follow/soju22?label=&style=social
[twitter-url]: https://twitter.com/soju22

Work in progress...

## Sponsors (Thanks 💙 !!!)

<a href="https://github.com/avaer">
  <img src="https://github.com/avaer.png" width="50px" />
</a>
<a href="https://github.com/designori-llc">
  <img src="https://github.com/designori-llc.png" width="50px" />
</a>
<a href="https://github.com/michelwaechter">
  <img src="https://github.com/michelwaechter.png" width="50px" />
</a>
<a href="https://github.com/okydk">
  <img src="https://github.com/okydk.png" width="50px" />
</a>

## Usage - npm

```
npm install three threejs-toys
```
## Toys

### Neon Cursor - https://codepen.io/soju22/full/wvyBorP

<img src="https://github.com/klevron/threejs-toys/blob/main/screenshots/neon-cursor.jpg?raw=true" style="width:30%;" />

```js
import { neonCursor } from 'threejs-toys'

neonCursor({
  el: document.getElementById('app'),
  shaderPoints: 16,
  curvePoints: 80,
  curveLerp: 0.5,
  radius1: 5,
  radius2: 30,
  velocityTreshold: 10,
  sleepRadiusX: 100,
  sleepRadiusY: 100,
  sleepTimeCoefX: 0.0025,
  sleepTimeCoefY: 0.0025
})
```

### Noisy Lines- https://codepen.io/soju22/full/YzePgPV

<img src="https://github.com/klevron/threejs-toys/blob/main/screenshots/bg-noisy-lines.jpg?raw=true" style="width:30%;" />

```js
import { noisyLinesBackground } from 'threejs-toys'

noisyLinesBackground({
  el: document.getElementById('app'),
  colors: [0x0231c3, 0xa6d1f6],
  minStroke: 0.5,
  maxStroke: 2,
  timeCoef: 0.0002,
  coordScale: 2,
  displacementScale: 0.02
})
```

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

https://codepen.io/collection/yrbrrk

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

### Fishes - https://codepen.io/soju22/full/qBxVXmb

<img src="https://github.com/klevron/threejs-toys/blob/main/screenshots/bg-fishes.jpg?raw=true" style="width:30%;" />

```js
import { fishesBackground } from 'threejs-toys'

fishesBackground({
  el: document.getElementById('app'),
  gpgpuSize: 96,
  background: 0x031F48,
  fogDensity: 0.025,
  texture: '/fishes.png',
  textureCount: 8,
  material: 'phong',
  materialParams: {
    transparent: true,
    alphaTest: 0.5
  },
  fishScale: [1, 1, 1],
  fishWidthSegments: 8,
  fishSpeed: 1.5,
  noiseCoordScale: 0.01,
  noiseTimeCoef: 0.0005,
  noiseIntensity: 0.0005,
  attractionRadius1: 50,
  attractionRadius2: 150,
  maxVelocity: 0.1
})
```

### Butterflies - https://codepen.io/soju22/full/dydVGEd

<img src="https://github.com/klevron/threejs-toys/blob/main/screenshots/bg-butterflies.jpg?raw=true" style="width:30%;" />

```js
import { butterfliesBackground } from 'threejs-toys'

butterfliesBackground({
  el: document.getElementById('app'),
  gpgpuSize: 64,
  background: 0xffffff,
  material: 'basic', // 'basic', 'phong', 'standard'
  materialParams: { transparent: true, alphaTest: 0.5 },
  texture: '/butterflies.png',
  textureCount: 4,
  wingsScale: [1, 1, 1],
  wingsWidthSegments: 8,
  wingsHeightSegments: 8,
  wingsSpeed: 0.75,
  wingsDisplacementScale: 1.25,
  noiseCoordScale: 0.01,
  noiseTimeCoef: 0.0005,
  noiseIntensity: 0.0025,
  attractionRadius1: 100,
  attractionRadius2: 150,
  maxVelocity: 0.1
})
```

With *phong* or *standard* material, you can setup lights :

```js
butterfliesBackground({
  // ...
  material: 'phong', // or 'standard'
  lights: [
    { type: 'ambient', params: [0xffffff, 0.5] },
    { type: 'directional', params: [0xffffff, 1], props: { position: [0, 10, 0] } }
  ],
  // ...
})
```

### Particles Cursor - https://codepen.io/soju22/full/KKQaGrE

<img src="https://github.com/klevron/threejs-toys/blob/main/screenshots/particles-cursor.jpg?raw=true" style="width:30%;" />

```js
import { particlesCursor } from 'threejs-toys'

particlesCursor({
  el: document.getElementById('app'),
  gpgpuSize: 256,
  colors: [0x00ff00, 0x0000ff],
  color: 0xff0000,
  coordScale: 1.5,
  noiseIntensity: 0.001,
  noiseTimeCoef: 0.0001,
  pointSize: 5,
  pointDecay: 0.005,
  sleepRadiusX: 250,
  sleepRadiusY: 250,
  sleepTimeCoefX: 0.001,
  sleepTimeCoefY: 0.002
})
```

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

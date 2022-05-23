<template>
  <div>
    <h1>Noisy<br>Lines</h1>
    <NoisyLines class="background" />
  </div>
</template>

<script setup lang="ts">
import NoisyLines from './components/NoisyLines'
</script>

<style>
body, html {
  margin: 0;
}

#app h1 {
  --fontSize: 70px;
  --lineHeight: 100px;
  width: auto;
  height: calc(2 * var(--lineHeight));
  line-height: var(--lineHeight);
  margin: calc(50vh - var(--lineHeight)) auto 0;
  text-align: center;
  color: #ffffff;
  font-family: 'Montserrat', sans-serif;
  font-size: var(--fontSize);
  text-shadow: 0 0 5px #ffffff, 0 0 20px #000, 0 0 30px #000;
  /* text-shadow: 0 0 20px #000, 0 0 30px #000; */
  text-transform: uppercase;
}

.background {
  position: fixed;
  z-index: -1;
  top: 0;
  width: 100%;
  height: 100%;
}
.background canvas {
  display: block;
}
</style>

mat3 lookAt(vec3 origin, vec3 target, vec3 up) {
  vec3 z = target - origin;
  if (z.x * z.x + z.y * z.y + z.z * z.z == 0.0) { z.z = 1.0; }
  z = normalize(z);
  vec3 x = cross(up, z);
  if (x.x * x.x + x.y * x.y + x.z * x.z == 0.0) {
    if (abs(up.z) == 1.0) { z.x += 0.0001; }
    else { z.z += 0.0001; }
    x = cross(up, z);
  }
  x = normalize(x);
  vec3 y = cross(z, x);
  return mat3(x, y, z);
}

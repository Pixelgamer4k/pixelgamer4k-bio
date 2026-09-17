/** Bridge: assets/three.min.js is UMD and sets window.THREE */
const THREE = window.THREE;
if (!THREE) {
  throw new Error('THREE missing — load assets/three.min.js before modules');
}
export default THREE;
export { THREE };

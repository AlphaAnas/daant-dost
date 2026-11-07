export const hasWebGL = (() => {
  let cached;
  return () => {
    if (cached !== undefined) return cached;
    try {
      const canvas = document.createElement("canvas");
      cached = Boolean(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
      );
    } catch {
      cached = false;
    }
    return cached;
  };
})();

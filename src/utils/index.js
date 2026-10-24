/**
 * 监听元素尺寸变化（节流到下一帧），返回取消监听的函数
 * @param {Element} el - 被监听的元素
 * @param {Function} callback - 尺寸变化后的回调
 * @returns {Function} disconnect
 */
const observeResize = (el, callback) => {
  if (!el || typeof ResizeObserver === 'undefined') return () => {};
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(callback);
  });
  observer.observe(el);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
};

export { observeResize };

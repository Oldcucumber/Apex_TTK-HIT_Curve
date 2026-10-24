/**
 * 将TTK数据转换为ECharts图表格式，并将小数转换为百分比
 * @param {Object} ttks - TTK数据对象
 * @param {Object} names - 武器名称映射对象
 * @returns {Array} ECharts series格式的数据
 */
const chartDataFormatter = (ttks, names) => {
  return Object.entries(ttks).map(([id, data]) => ({
    id,
    name: names[id],
    type: 'line',
    data: data.map(([x, y]) => [x * 100, y])
  }));
};

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

export { chartDataFormatter, observeResize };

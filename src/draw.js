const lineWeight = 2;
/**
 * 画单独的框,
 * 使用左上、右上、左下、右下点位，line画图
 * @param item 框的点位
 * @param canvas 画布
 * @param color 颜色
 */
export const drawItem = (item, canvas, color = "green") => {
  
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 + lineWeight;
  ctx.beginPath();
  ctx.moveTo(item[0].x - lineWeight, item[0].y - lineWeight);
  ctx.lineTo(item[1].x + lineWeight, item[1].y - lineWeight);
  ctx.lineTo(item[2].x + lineWeight, item[2].y + lineWeight);
  ctx.lineTo(item[3].x - lineWeight, item[3].y + lineWeight);
  ctx.closePath();
  ctx.stroke();
};
/**
 * 清除框
 * @param {*} item
 * @param {*} canvas
 * @param {*} color
 */
export const removeItem = (item, canvas) => {
  const ctx = canvas.getContext("2d");
  // 计算边界框
  const xs = item.map((p) => p.x);
  const ys = item.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const padding = 2; // 额外填充以确保清除线宽
  ctx.clearRect(
    minX - padding,
    minY - padding,
    maxX - minX + 2 * padding,
    maxY - minY + 2 * padding
  );
};

/**
 * 清空整个canvas
 */
export const clearCanvas = (canvas) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

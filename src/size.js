export const changeSizeFunc = (ratio, list) => {
  return list.map((item) => {
    return {
      x: item.x * ratio,
      y: item.y * ratio,
    };
  });
};

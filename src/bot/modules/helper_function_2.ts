// fucntion to calculate user current data prices discount
const computeDiscount = (transactNum: number): number => {
  if (transactNum > 7) return 0;
  if (transactNum === 7) return 10;
  if (transactNum === 6) return 20;
  if (transactNum === 5) return 30;
  if (transactNum === 4) return 40;
  if (transactNum === 3) return 50;
  if (transactNum === 2) return 60;
  if (transactNum > 1) return 70;
  return 0;
};

export { computeDiscount };

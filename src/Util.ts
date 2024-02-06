export const chooseRandom = (arr: any[]) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export function numberWithCommas(x: string) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function randomInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatDuration(ms){
  const sec = Math.round(ms/1000);
  if (sec < 60) return `${sec} сек.`;
  const m = Math.floor(sec/60), s = sec%60;
  return `${m} мин. ${s} сек.`;
}

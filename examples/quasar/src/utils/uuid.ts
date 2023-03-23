import { uid } from 'quasar';

export function comb(date?: Date) {
  if (!date) {
    date = new Date();
  }
  const uuid = uid();
  let comb = ('00000000000' + date.getTime().toString(16)).substr(-12);
  comb = comb.slice(0, 8) + '-' + comb.slice(8, 12);
  return uuid.replace(uuid.slice(0, 13), comb);
}

export function extract(comb: string) {
  const text = comb.replace(/-/g, '').substr(0, 12);
  const time = parseInt(text, 16);
  return new Date(time);
}

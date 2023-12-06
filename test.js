// to test implmentations
const date = new Date('2024-12-09T18:23:44.656Z');
const date2 = new Date();

console.log(date);
console.log(date.now)
console.log(date.getDate())
console.log('year 1', date.getFullYear())
console.log('year 2', date2.getFullYear());
console.group(date.getDay());
console.log('month - diff', date.getMonth() - date2.getMonth())
console.log(date2.getMonth())
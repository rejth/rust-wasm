// !!! IMPORTANT: Direct WASM imports require Node.js v24.11.0+
import { factorial } from './factorial/factorial.wasm';
import { sum } from './sum/sum.wasm';

console.log(factorial(5));
console.log(sum(1, 1));

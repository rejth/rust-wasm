class App {
  constructor() {}

  async factorial() {
    const wasm = await WebAssembly.instantiateStreaming(await fetch('factorial.wasm'));
    console.log(wasm.instance.exports.factorial(5));
  }

  async hello() {
    const wasm = await WebAssembly.instantiateStreaming(await fetch('hello.wasm'), {
      env: {
        log: (from, to) => {
          const memory = wasm.instance.exports.memory;
          console.log(new TextDecoder().decode(memory.buffer.slice(from, to)));
        },
      },
    });

    wasm.instance.exports.hello();
  }
}

let APP = null;

window.addEventListener('DOMContentLoaded', async () => {
  APP = new App();
  await APP.hello();
  await APP.factorial();
});

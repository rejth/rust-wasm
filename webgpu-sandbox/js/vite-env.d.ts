/// <reference types="vite/client" />

declare module '*.wgsl' {
  const src: string;
  export default src;
}

declare module 'https://webgpufundamentals.org/3rdparty/muigui-0.x.module.js' {
  const GUI: {
    converters: { radToDeg: unknown };
    new (): {
      add: (...args: unknown[]) => { name: (label: string) => void };
      onChange: (cb: () => void) => void;
    };
  };
  export default GUI;
}

const callbacks = new Map();

export const registerCallback = (key, fn) => {
  if (typeof fn === 'function') {
    callbacks.set(key, fn);
  }
};

export const invokeCallback = (key, ...args) => {
  const fn = callbacks.get(key);
  if (typeof fn === 'function') {
    try { fn(...args); } finally { callbacks.delete(key); }
  }
};

export const unregisterCallback = (key) => {
  callbacks.delete(key);
};

export const hasCallback = (key) => callbacks.has(key);

export default {
  registerCallback,
  invokeCallback,
  unregisterCallback,
  hasCallback,
};


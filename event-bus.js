const listeners = {};

export function subscribe(eventName, callback) {
  if (!listeners[eventName]) {
    listeners[eventName] = [];
  }
  listeners[eventName].push(callback);
  
  return () => {
    const index = listeners[eventName].indexOf(callback);
    if (index > -1) {
      listeners[eventName].splice(index, 1);
    }
  };
}

export function publish(eventName, data) {
  if (!listeners[eventName]) return;
  listeners[eventName].forEach(callback => callback(data));
}

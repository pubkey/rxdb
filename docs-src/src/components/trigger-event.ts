export function trigger(type, value) {
    if (!window.trigger) {
        throw new Error('window.trigger not defined');
    }
    return window.trigger(type, value);
}

export function trying<T>(fun: () => T, verbose = true) {
  try {
    return fun();
  } catch (e) {
    if (verbose) {
      console.error(e);
    }
    return undefined;
  }
}

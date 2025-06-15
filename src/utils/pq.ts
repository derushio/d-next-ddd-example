const _pq = import('p-queue');

/**
 * import p-queue
 */
export async function ipq() {
  const { default: pq } = await _pq;
  return pq;
}

export async function ipqi(num = 3) {
  return new (await ipq())({
    concurrency: num,
  });
}

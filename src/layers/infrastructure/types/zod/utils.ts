import { z } from 'zod';

export const upperzero = (zo: ReturnType<(typeof z)['number']>) =>
  zo.refine((v) => 0 < v);

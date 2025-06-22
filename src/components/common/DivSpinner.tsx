import { clsx } from 'clsx';
import { Loading } from '@/components/ui/Loading';

export function DivSpinner() {
  return (
    <div className={clsx('flex justify-center items-center p-4')}>
      <Loading variant='spinner' size='md' color='blue' text='読み込み中...' />
    </div>
  );
}

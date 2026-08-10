import { Loading } from '@/components/ui/loading';

export function DivSpinner() {
  return (
    <div className='flex justify-center items-center p-4'>
      <Loading
        variant='spinner'
        size='md'
        color='primary'
        text='読み込み中...'
      />
    </div>
  );
}

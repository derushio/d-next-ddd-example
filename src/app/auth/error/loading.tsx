import { Loading } from '@/components/ui/loading';

export default function AuthErrorLoading() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <Loading size='lg' text='読み込み中...' />
    </div>
  );
}

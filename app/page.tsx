import { PageClient } from '@/components/PageClient';
import { demoUser } from '@/lib/user';

export default function Page() {
  return <PageClient user={demoUser} />;
}

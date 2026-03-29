import { useAuth } from '../context/AuthContext';
import ParentDashboard from './ParentDashboard';
import ChildDashboard from './ChildDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user.role === 'parent') {
    return <ParentDashboard />;
  }

  return <ChildDashboard />;
}

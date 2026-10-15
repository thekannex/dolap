import { useProjectStore } from '../../../stores/project-store';
import ProjectList from './ProjectList';
import ProjectOverview from './ProjectOverview';

export default function ProjectPage() {
  const hasProject = useProjectStore((s) => s.project !== null);
  return hasProject ? <ProjectOverview /> : <ProjectList />;
}

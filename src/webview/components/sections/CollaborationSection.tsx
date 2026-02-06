import { type ComponentProps, type FC } from 'react';
import CollaborationView from '../common/CollaborationView';

export type CollaborationSectionProps = ComponentProps<typeof CollaborationView>;

const CollaborationSection: FC<CollaborationSectionProps> = props => <CollaborationView {...props} />;

export default CollaborationSection;

import { type ComponentProps, type FC } from 'react';
import Calendar from '../common/Calendar';

export type HomeSectionProps = ComponentProps<typeof Calendar>;

const HomeSection: FC<HomeSectionProps> = props => <Calendar {...props} />;

export default HomeSection;

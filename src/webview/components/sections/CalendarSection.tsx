import { type ComponentProps, type FC } from 'react';
import Calendar from '../common/Calendar';

export type CalendarSectionProps = ComponentProps<typeof Calendar>;

const CalendarSection: FC<CalendarSectionProps> = props => <Calendar {...props} />;

export default CalendarSection;

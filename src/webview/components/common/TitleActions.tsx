import { FC, ReactNode } from 'react';

/** Groups the detail-view header action buttons: tight gap between them, larger gap from the title. */
const TitleActions: FC<{ children: ReactNode }> = ({ children }) => <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', gap: '1px', marginLeft: '14px' }}>{children}</span>;

export default TitleActions;

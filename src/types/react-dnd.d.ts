/**
 * Type declaration override for @types/react-dnd compatibility with React 18
 *
 * React 18 removed StatelessComponent in favor of FunctionComponent/FC.
 * This file provides a compatibility layer by augmenting the React namespace
 * to restore the StatelessComponent type that @types/react-dnd v2.x expects.
 */

import type { FunctionComponent } from 'react';

declare global {
	namespace React {
		/**
		 * @deprecated Use React.FunctionComponent or React.FC instead.
		 * This type is provided for backward compatibility with @types/react-dnd v2.x
		 */
		type StatelessComponent<P = {}> = FunctionComponent<P>;
	}
}

export {};

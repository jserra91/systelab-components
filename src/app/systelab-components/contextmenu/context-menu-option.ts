import { ContextMenuActionData } from './context-menu-action-data';

export type ContextMenuActionFunction = (data: ContextMenuActionData) => void;
export type ContextMenuIsEnabledFunction = (elementId: string, actionId: string) => boolean;
export type ContextMenuIsIconEnabledFunction = (elementId: string, actionId: string) => boolean;

export class ContextMenuOption {

	constructor(public actionId: string,
				public actionText: string,
				public action?: ContextMenuActionFunction,
				public isActionEnabled?: ContextMenuIsEnabledFunction,
				public isDivider?: boolean,
				public iconClass?: string,
				public backgroundIconColor?: string,
				public iconColor?: string,
				public isIconEnabled?: ContextMenuIsIconEnabledFunction,
				public childrenContextMenuOptions?: Array<ContextMenuOption>,
	            public iconFontSize?: string) {
	}

}

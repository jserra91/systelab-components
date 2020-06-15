import { ChangeDetectorRef, Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { AgRendererComponent } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { StylesUtilService } from '../utilities/styles.util.service';
import { ComboboxFavouriteRendererComponent } from './renderer/combobox-favourite-renderer.component';
import { PreferencesService } from 'systelab-preferences';

declare var jQuery: any;

@Directive()
export abstract class AbstractComboBox<T> implements AgRendererComponent, OnInit, OnDestroy {

	public static ROW_HEIGHT = -1;

	@ViewChild('input', {static: false}) public input: ElementRef;

	public comboId: string = (Math.floor(Math.random() * (999999999999 - 1))).toString();

	@Input() public customInputRenderer: any;
	@Input() public initialParams: any;

	@Input() public filter = false;
	@Input() public multipleSelection = false;
	@Input() public listSelectedValues = false;
	@Input() public allElement = false;

	@Input() public fontFamily: string;
	@Input() public fontSize: string;
	@Input() public fontWeight: string;
	@Input() public fontStyle: string;
	@Input() public withIcon: boolean;
	@Input() public withDeleteOption: boolean;
	@Input() public defaultIdValue: string | number;
	@Input() public defaultDescription: string;
	@Input() public defaultCode: string;
	@Input() public iconClass: string;
	@Input() public inputColor: string;
	@Input() public iconColor: string;

	public suppressKeyboardEvent;

	public getAllFieldIDValue(): string | number {
		return '0';
	}

	public getAllFieldDescriptionValue(): string {
		return '';
	}

	public getAllCodeFieldValue(): string {
		return '';
	}

	public getAllInstance(): T {
		const instance = this.getInstance();

		instance[this.getIdField()] = this.getAllFieldIDValue();
		instance[this.getDescriptionField()] = this.getAllFieldDescriptionValue();
		instance[this.getCodeField()] = this.getAllCodeFieldValue();

		return instance;
	}

	public _values: Array<any>;
	@Input()
	set values(newValues: Array<any>) {
		this._values = newValues;
		if (this.gridOptions) {
			this.gridOptions.rowData = this._values;
		}
		this.setCodeDescriptionById();
	}

	get values() {
		return this._values;
	}

	@Input() public isDisabled: boolean;
	@Input() public expandToParentContainerHeight = false;
	@Output() public change = new EventEmitter();
	@Output() public idChange = new EventEmitter();
	@Output() public descriptionChange = new EventEmitter();
	@Input() public allowEditInput = false;
	@Input() public emptyElement = false;
	@Input() public selectDeselectAll = false;
	@Input() public withFavourites = false;
	@Input() public preferenceName: string;

	public isFavourite = false;
	public favouriteList: Array<string | number> = [];
	public isTree = false;

	public _id: number | string;
	@Input()
	set id(value: number | string) {
		this._id = value;
		this.idChange.emit(value);
		this.setCodeDescriptionById();
		if (value !== undefined && value !== null) {
			this.checkIfIsFavourite(value.toString());
		}
	}

	get id() {
		return this._id;
	}

	public _description: string;

	@Input()
	set description(value: string) {
		this._description = value;
		if (this.id && this.values) {
			const item: T = this.values.find(it => it[this.getIdField()] === this.id);
			if (item) {
				this._description = item[this.getDescriptionField()];
			}
		}
		this.descriptionChange.emit(this._description);
		this.fieldToShow = this._description;
	}

	get description() {
		return this._description;
	}

	public _level: number;
	@Input()
	set level(value: number) {
		this._level = value;
	}

	get level() {
		return this._level;
	}

	public _fieldToShow: string;
	@Input()
	set fieldToShow(value: string) {
		this._fieldToShow = value;
		this.fieldToShowChange.emit(this._fieldToShow);
	}

	get fieldToShow() {
		return this._fieldToShow;
	}

	@Output() public fieldToShowChange = new EventEmitter();

	public _code: string;
	@Input()
	set code(value: string) {
		this._code = value;
		if (this.id && this.values) {
			const item: T = this.values.find(it => it[this.getIdField()] === this.id);
			if (item) {
				this._code = item[this.getCodeField()];
			}
		}
		this.codeChange.emit(this._code);
	}

	get code() {
		return this._code;
	}

	@Output() public codeChange = new EventEmitter();

	public _multipleSelectedItemList: Array<T> = [];

	@Input()
	set multipleSelectedItemList(value: Array<T>) {
		this._multipleSelectedItemList = value;
		this.setDescriptionAndCodeWhenMultiple(value);
		this.multipleSelectedItemListChange.emit(this._multipleSelectedItemList);
		this.multipleSelectedIDListChange.emit(this.selectionItemListToIDList());
	}

	get multipleSelectedItemList() {
		return this._multipleSelectedItemList;
	}

	@Output() public multipleSelectedItemListChange = new EventEmitter();
	@Output() public multipleSelectedIDListChange = new EventEmitter();
	@Output() public selectedItemChange = new EventEmitter();

	@ViewChild('combobox', {static: true}) public comboboxElement: ElementRef;
	@ViewChild('dropdowntoogle', {static: false}) public dropdownToogleElement: ElementRef;
	@ViewChild('dropdownmenu', {static: false}) public dropdownMenuElement: ElementRef;
	@ViewChild('dropdown', {static: true}) public dropdownElement: ElementRef;
	@ViewChild('input', {static: false}) public inputElement: ElementRef;
	@ViewChild('hidden', {static: true}) public hiddenElement: ElementRef;

	public filterValue = '';
	public currentSelected: any = {};
	public selectionChanged = false;

	public gridOptions: GridOptions;
	public columnDefs: Array<any>;

	public params: any;

	public top = 0;
	public left = 0;
	public windowResized = false;
	public isDropdownOpened = false;
	public scrollHandler: any;

	constructor(public myRenderer: Renderer2, public chRef: ChangeDetectorRef, public preferencesService?: PreferencesService) {
	}

	public ngOnInit() {
		this.suppressKeyboardEvent = (params) => {
			const KEY_TAB = 9;
			return params.event.which === KEY_TAB;
		};
		this.setRowHeight();

		this.setStyle('font-family', this.fontFamily);
		this.setStyle('font-size', this.fontSize);
		this.setStyle('font-weight', this.fontWeight);
		this.setStyle('font-style', this.fontStyle);

		jQuery(this.comboboxElement.nativeElement)
			.on('hide.bs.dropdown', this.closeDropDown.bind(this));

		this.initializeFavouriteList();
		this.configGrid();
	}

	private setStyle(styleName: string, styleValue: string): void {
		if (styleValue) {
			this.myRenderer.setStyle(this.dropdownElement.nativeElement, styleName, styleValue);
		}
	}

	protected setDescriptionAndCodeWhenMultiple(value: Array<T>) {
		this._description = '';
		this._code = '';
		for (const selectedItem of value) {
			if (this._code !== '') {
				this._code += '; ';
			}
			this._code += selectedItem[this.getCodeField()];

			if (this._description !== '') {
				this._description += '; ';
			}
			this._description += selectedItem[this.getDescriptionField()];
		}
	}

	private initializeFavouriteList(): void {
		const favouriteListPreference: Array<string | number> = (this.preferencesService) ? this.preferencesService.get(this.preferenceName + '.favourites') : undefined;
		if (this.withFavourites && favouriteListPreference && favouriteListPreference.length > 0) {
			this.favouriteList = favouriteListPreference;
			if (this.id !== undefined && this.id !== null) {
				this.checkIfIsFavourite(this.id.toString());
			}
		}
	}

	protected configGrid() {
		this.columnDefs = (this.withFavourites) ? [
			{
				colId:                 'itemDescription',
				id:                    this.getIdField(),
				field:                 this.getDescriptionField(),
				checkboxSelection:     this.multipleSelection,
				cellRendererFramework: ComboboxFavouriteRendererComponent,
				cellRendererParams:    {
					favouriteList: this.favouriteList
				}
			}
		] : [
			{
				colId:             'itemDescription',
				field:             this.getDescriptionField(),
				checkboxSelection: this.multipleSelection,
			}
		];
		this.gridOptions = {};

		this.gridOptions.columnDefs = this.columnDefs;

		this.gridOptions.rowHeight = AbstractComboBox.ROW_HEIGHT;
		this.gridOptions.headerHeight = 0;
		this.gridOptions.suppressCellSelection = true;

		if (this.multipleSelection) {
			this.gridOptions.rowSelection = 'multiple';
			this.gridOptions.suppressRowClickSelection = true;
		} else {
			this.gridOptions.rowSelection = 'single';
		}

		this.gridOptions.getRowNodeId = (item) => item[this.getIdField()] ? item[this.getIdField()] : null;

		this.configGridData();

	}

	protected configGridData() {
		this.gridOptions.rowData = this.values;
	}

	protected setRowHeight() {
		const lineHeight = StylesUtilService.getStyleValue(this.hiddenElement, 'line-height');
		AbstractComboBox.ROW_HEIGHT = Number(lineHeight ? lineHeight : 26);
	}

	public abstract getInstance(): T;

	public abstract getDescriptionField(): string;

	public abstract getCodeField(): string;

	public abstract getIdField(): string;

	public refresh(params: any): boolean {
		return true;
	}

	public agInit(params: any): void {
		this.params = params;
	}

	public getInputHeight() {
		return this.expandToParentContainerHeight ? {'height': '100%'} : undefined;
	}

	protected getComboPreferencesPrefix(): string {
		return this.preferenceName || this.constructor.name;
	}

	public doToggleFavourite(event: MouseEvent): void {
		event.stopPropagation();
		this.toggleFavourite();
	}

	public deleteValueSelected(event: MouseEvent): void {
		event.stopPropagation();
		if (this.multipleSelection) {
			if (this.multipleSelectedItemList && this.multipleSelectedItemList.length > 0) {
				this.multipleSelectedItemList = [];
			}
		} else {
			this.id = this.defaultIdValue ? this.defaultIdValue : undefined;
			this._description = this.defaultDescription ? this.defaultDescription : undefined;
			this._code = this.defaultCode ? this.defaultCode : undefined;
		}

	}

	public onComboClicked(event: any) {
		if (this.isDisabled || (this.allowEditInput && event.target.className.indexOf('input') > -1)) {
			event.stopPropagation();
		} else {
			if (!this.isDropDownOpen()) {
				this.isDropdownOpened = true;
				this.showDropDown();
			} else {
				// close
				this.checkMultipleSelectionClosed();
			}
		}
	}

	public onComboKeydown(event: any) {
		if (!this.isDropDownOpen()) {
			this.isDropdownOpened = true;
			this.showDropDown();
		} else {
			// close
			this.checkMultipleSelectionClosed();
		}
	}

	protected toggleFavourite(): void {
		this.isFavourite = !this.isFavourite;
		if (this.isFavourite) {
			this.favouriteList.push(this.id.toString());
		} else {
			this.favouriteList.splice(this.favouriteList.map(String)
				.indexOf(this.id.toString()), 1);
		}
		this.preferencesService.put(this.getComboPreferencesPrefix() + '.favourites', this.favouriteList.map(String));
	}

	public setDropdownWidth() {
		const parentWidth = this.comboboxElement.nativeElement.offsetWidth;
		this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'width', parentWidth + 'px');
		this.setGridSize();
	}

	public isDropDownOpen(): boolean {
		return this.comboboxElement.nativeElement.className.includes('show');
	}

	public closeDropDown() {
		this.isDropdownOpened = false;
		this.removeScrollHandler();
		this.resetDropDownPositionAndHeight();
		if (this.isDropDownOpen()) {
			this.myRenderer.removeClass(this.comboboxElement.nativeElement, 'show');
			this.myRenderer.removeClass(this.dropdownMenuElement.nativeElement, 'show');
		}
		this.chRef.detectChanges();
		this.checkMultipleSelectionClosed();
		this.input.nativeElement.focus();
	}

	public resetDropDownPositionAndHeight() {
		this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'top', null);
		this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'left', null);
		this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'height', '0px');
	}

	public loop(): void {
		let result = true;

		if (this.isDropDownOpen()) {
			this.setDropdownHeight();
			this.setDropdownPosition();
			this.transferFocusToGrid();
			result = false;
		}
		if (result && this.isDropdownOpened) {
			setTimeout(() => this.loop(), 10);
		} else {
			return;
		}
	}

	private transferFocusToGrid(): void {
		// scrolls to the first row
		this.gridOptions.api.ensureIndexVisible(0);

		// scrolls to the first column
		const firstCol = this.gridOptions.columnApi.getAllDisplayedColumns()[0];
		this.gridOptions.api.ensureColumnVisible(firstCol);

		// sets focus into the first grid cell
		this.gridOptions.api.setFocusedCell(0, firstCol);
	}

	public onCellKeyDown(e: any) {
		if (e.event.key === 'Enter') {
			this.gridOptions.api.selectNode(e.node);
			e.event.preventDefault();
		}
	}

	public showDropDown() {
		this.addScrollHandler();
		this.setDropdownWidth();
		if (!this.isDropDownOpen()) {
			setTimeout(() => this.loop(), 10);
		}
	}

	public clickDropDownMenu(e: Event) {
		e.stopPropagation();
	}

	public setDropdownHeight() {
		let calculatedHeight = 0;
		const totalItems: number = this.getTotalItemsForDropdownHeight();

		if (this.selectDeselectAll === true) {
			calculatedHeight += AbstractComboBox.ROW_HEIGHT + 10;
		}
		if (this.filter === true) {
			calculatedHeight += AbstractComboBox.ROW_HEIGHT + 5;
		}

		if (totalItems === 0) {
			calculatedHeight += 8 + AbstractComboBox.ROW_HEIGHT;
			this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'height', calculatedHeight + 'px');
		} else if (totalItems < 10) {
			calculatedHeight += 8 + AbstractComboBox.ROW_HEIGHT * totalItems;
			this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'height', calculatedHeight + 'px');
		} else {
			calculatedHeight += AbstractComboBox.ROW_HEIGHT * 10;
			this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'height', calculatedHeight + 'px');
		}

	}

	protected getTotalItemsInCombo(): number {
		return Number(this.values ? this.values.length : 0);
	}

	protected getTotalItemsForDropdownHeight(): number {
		let totalItems = this.getTotalItemsInCombo();
		if (this.emptyElement) {
			totalItems += 1;
		}
		if (this.allElement) {
			totalItems += 1;
		}
		return totalItems;
	}

	public setDropdownPosition() {
		this.myRenderer.setStyle(this.dropdownMenuElement.nativeElement, 'position', 'fixed');
		const dropdownParentRect: any = this.inputElement.nativeElement.getBoundingClientRect();
		this.top = dropdownParentRect.top;

		// Trick for positioning in IE11
		if (!!(<any>window).MSInputMethodContext && !!(<any>window).document.documentMode) {
			this.top = dropdownParentRect.top + this.inputElement.nativeElement.offsetHeight;
		}

		this.left = dropdownParentRect.left;
		if (this.top + this.dropdownElement.nativeElement.offsetHeight > window.innerHeight) {
			this.top = this.top - this.dropdownElement.nativeElement.offsetHeight - this.inputElement.nativeElement.offsetHeight - 2;
		}
		this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'top', this.top + 'px');
		this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'left', this.left + 'px');
	}

	public getSelectedRow(): T {
		if (this.gridOptions && this.gridOptions.api) {
			const selectedRow: Array<T> = this.gridOptions.api.getSelectedRows();
			if (selectedRow !== null) {
				return selectedRow[0];
			}
		}
		return undefined;
	}

	public doSearch(event: any) {
		this.filterValue = event.target.value;
		this.doFilter();
	}

	public doFilter() {
		const auxListArray = this.values.filter(element => element.description.toLowerCase()
			.indexOf(this.filterValue.toLowerCase()) > -1);
		this.gridOptions.api.setRowData(auxListArray);
	}

	public doSelectAll() {
		this.gridOptions.api.selectAll();
	}

	public doDeselectAll() {
		this.gridOptions.api.deselectAll();
	}

	public onSelectionChanged(event: any) {
		if (!this.multipleSelection) {
			const selectedRow = this.getSelectedRow();
			if (selectedRow !== null && selectedRow !== undefined) {
				this.id = selectedRow[this.getIdField()];
				this.code = selectedRow[this.getCodeField()];
				this.description = selectedRow[this.getDescriptionField()];
				this.currentSelected = selectedRow;
				this.change.emit(selectedRow);
				this.selectedItemChange.emit(selectedRow);
				this.closeDropDown();
				if (selectedRow[this.getIdField()]) {
					this.checkIfIsFavourite(selectedRow[this.getIdField()].toString());
				}
			}
		} else {
			this.selectionChanged = true;
		}
	}

	private checkIfIsFavourite(id: string): void {
		this.isFavourite = (id !== undefined && id !== null) ? this.favouriteList.map(String)
			.indexOf(id) > -1 : false;
	}

	public onModelUpdated() {
		this.gridOptions.api.sizeColumnsToFit();
		if (this.multipleSelection) {
			if (this.multipleSelectedItemList && this.multipleSelectedItemList.length > 0) {
				this.gridOptions.api.forEachNode(node => {
					if (this.multipleSelectedItemList.some((item) => (item !== undefined && item[this.getIdField()] === node.id))) {
						node.selectThisNode(true);
					}
				});
			}
		} else if (this._id && this._id !== undefined) {
			this.gridOptions.api.forEachNode(node => {
				if (node.id === this._id) {
					this.currentSelected = node.data;
					node.selectThisNode(true);
				}
			});
		}
	}

	public setGridSize() {
		this.gridOptions.rowHeight = AbstractComboBox.ROW_HEIGHT;
		if (this.gridOptions.api && this.columnDefs) {
			if (this.windowResized) {
				setTimeout(() => {
					this.gridOptions.api.doLayout();
					this.gridOptions.api.sizeColumnsToFit();
					this.windowResized = false;
				}, 5);
			} else {
				this.gridOptions.api.doLayout();
				this.gridOptions.api.sizeColumnsToFit();
			}
		}
	}

	// overrides
	public onRowSelected(event: any) {
		if (!this.multipleSelection) {
		} else if (event.node && event.node.data && event.node.data[this.getIdField()] !== undefined) {
			const newElement: T = this.getInstance();
			if (this.multipleSelectedItemList && this.multipleSelectedItemList !== undefined) {
				const elementIndexInSelectedList: number = this.multipleSelectedItemList.findIndex((item) => {
					return item[this.getIdField()] === event.node.data[this.getIdField()];
				});
				if (event.node.selected) {
					if (elementIndexInSelectedList < 0) {
						if (this.allElement) {
							// if the selectedNode is "all"
							if (event.node.data[this.getIdField()] === this.getAllFieldIDValue()) {
								this.multipleSelectedItemList = [];
								this.unselectAllNodesInGridpOptions();
							} else {
								// the selectedNode is NOT "all: was "all" node already selected?
								const elementAllInSelectedList: number = this.multipleSelectedItemList.findIndex((item) => {
									return item[this.getIdField()] === this.getAllFieldIDValue();
								});
								// yes, it was => unselect "all" node and empty the multipleSelectedItemList
								if (elementAllInSelectedList !== -1) {
									this.multipleSelectedItemList = [];
									this.unselectNodeAllInGridOptions();
								}
							}
						}
						// Regardless the value of allElement, we have to add the newElement using the selectedNode
						this.multipleSelectedItemList.push(event.node.data);
						this.multipleSelectedItemList = this.multipleSelectedItemList.slice();
					}
				} else {
					if (elementIndexInSelectedList !== -1) {
						this.multipleSelectedItemList.splice(elementIndexInSelectedList, 1);
						this.multipleSelectedItemList = this.multipleSelectedItemList.slice();
					}
				}
			} else {
				this.multipleSelectedItemList = [];
				this.multipleSelectedItemList.push(event.node.data);
				this.multipleSelectedItemList = this.multipleSelectedItemList.slice();
			}
			this.setDescriptionAndCodeWhenMultiple(this.multipleSelectedItemList);
		}
	}

	private unselectAllNodesInGridpOptions() {
		if (this.gridOptions && this.gridOptions.api) {
			this.gridOptions.api.forEachNode(node => {
				if (node && node.id !== this.getAllFieldIDValue()) {
					node.selectThisNode(false);
				}
			});
		}
	}

	private unselectNodeAllInGridOptions() {
		if (this.gridOptions && this.gridOptions.api) {
			this.gridOptions.api.forEachNode(node => {
				if (node && node.id === this.getAllFieldIDValue()) {
					node.selectThisNode(false);
				}
			});
		}
	}

	public setCodeDescriptionById() {
		if (this.id !== undefined && this.values) {
			const item: T = this.values.find(it => it[this.getIdField()] === this.id);
			if (item) {
				this.description = item[this.getDescriptionField()];
				this.code = item[this.getCodeField()];
			}
		}
	}

	@HostListener('window:resize', ['$event'])
	public onResize(event: any) {
		if (this.isDropDownOpen()) {
			this.closeDropDown();
		}
		const parentWidth = this.comboboxElement.nativeElement.offsetWidth;
		this.myRenderer.setStyle(this.dropdownElement.nativeElement, 'width', parentWidth + 'px');
		this.windowResized = true;
	}

	protected isComboBoxScrolling(element: HTMLElement): boolean {
		if (element.id === this.dropdownElement.nativeElement.id) {
			return true;
		} else if (element.parentElement) {
			return this.isComboBoxScrolling(element.parentElement);
		}
		return false;
	}

	protected scroll(event) {
		if (!this.isComboBoxScrolling(event.target)) {
			this.closeDropDown();
		}
	}

	protected addScrollHandler() {
		this.scrollHandler = this.scroll.bind(this);
		window.addEventListener('scroll', this.scrollHandler, true);
	}

	protected removeScrollHandler() {
		window.removeEventListener('scroll', this.scrollHandler, true);
	}

	public ngOnDestroy() {
		this.removeScrollHandler();
		this.chRef.detach();
	}

	public removeItem(item: T) {
		const index = this.multipleSelectedItemList.findIndex(it => it[this.getIdField()] === item[this.getIdField()]);
		if (index !== -1) {
			this.multipleSelectedItemList.splice(index, 1);
			this.multipleSelectedItemList = this.multipleSelectedItemList;
		}
	}

	private selectionItemListToIDList(): Array<string | number> {
		return this.multipleSelectedItemList.map(item => item[this.getIdField()]);
	}

	public checkMultipleSelectionClosed() {
		if (this.selectionChanged) {
			this.change.emit(this.multipleSelectedItemList);
			this.selectedItemChange.emit(this.multipleSelectedItemList);
			this.multipleSelectedItemListChange.emit(this.multipleSelectedItemList);
			this.multipleSelectedIDListChange.emit(this.selectionItemListToIDList());
		}
	}

	public doGridReady(e) {
		if (this.filterValue && this.filter === true) {
			this.doFilter();
		}
	}

}
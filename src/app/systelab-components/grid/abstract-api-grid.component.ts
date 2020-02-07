import { OnInit } from '@angular/core';
import { DialogService } from '../modal/dialog/dialog.service';
import { AbstractGrid } from './abstract-grid.component';
import { Observable } from 'rxjs';
import { IDatasource, IGetRowsParams } from 'ag-grid-community';
import { PreferencesService } from 'systelab-preferences/lib/preferences.service';
import { I18nService } from 'systelab-translate/lib/i18n.service';

export abstract class AbstractApiGrid<T> extends AbstractGrid<T> implements IDatasource, OnInit {

	constructor(preferencesService: PreferencesService, i18nService: I18nService, dialogService: DialogService) {
		super(preferencesService, i18nService, dialogService);
	}

	public ngOnInit() {

		super.ngOnInit();

		this.gridOptions.rowModelType = 'infinite';
		this.gridOptions.paginationPageSize = 50;
		this.gridOptions.cacheBlockSize = 50;
		this.gridOptions.cacheOverflowSize = 2;
		this.gridOptions.maxConcurrentDatasourceRequests = 4;
		this.gridOptions.maxBlocksInCache = 15;
		this.gridOptions.infiniteInitialRowCount = 0;

		this.gridOptions.datasource = this;
	}

	public abstract getTotalItems(): number;

	protected abstract getData(page: number, itemsPerPage: number): Observable<Array<T>>;

	public getRows(params: IGetRowsParams): void {
		this.gridOptions.api.showLoadingOverlay();
		this.getData(params.endRow / this.gridOptions.paginationPageSize, this.gridOptions.paginationPageSize)
			.subscribe(
				(page: Array<T>) => this.putPage(page, this.getTotalItems(), params),
				error => this.putPage([], 0, params));
	}

	protected putPage(page: Array<T>, totalItems: number, params: IGetRowsParams) {
		this.gridOptions.api.hideOverlay();
		params.successCallback(page, totalItems);
		if (page.length === 0) {
			this.gridOptions.api.showNoRowsOverlay();
		} else {
			if (this.forcedIndexSelection) {
				this.gridOptions.api.selectIndex(this.forcedIndexSelection, false, false);
				this.forcedIndexSelection = undefined;
			}
		}
	}

	public refresh() {
		this.gridOptions.api.setDatasource(this);
	}
}

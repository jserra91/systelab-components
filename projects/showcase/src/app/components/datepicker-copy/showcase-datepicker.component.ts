import { Component, NgZone } from '@angular/core';
import { Month, Week } from 'systelab-components';
import { I18nService } from 'systelab-translate';

@Component({
	selector:    'showcase-p-datepicker',
	templateUrl: 'showcase-datepicker.component.html'
})
export class ShowcasePDatepickerComponent {

	date1: Date;

    date2: Date;

    date3: Date;

    date4: Date;

    date5: Date;

    date6: Date;

    date7: Date;

    date8: Date;

    date9: Date;

    date10: Date;

    date11: Date;

    date12: Date;

    date13: Date;

    date14: Date;

    dates: Date[];

    rangeDates: Date[];

    minDate: Date;

    maxDate: Date;

    invalidDates: Array<Date>

	constructor(public i18nService: I18nService, protected readonly zone: NgZone) {
		let today = new Date();
        let month = today.getMonth();
        let year = today.getFullYear();
        let prevMonth = (month === 0) ? 11 : month -1;
        let prevYear = (prevMonth === 11) ? year - 1 : year;
        let nextMonth = (month === 11) ? 0 : month + 1;
        let nextYear = (nextMonth === 0) ? year + 1 : year;
        this.minDate = new Date();
        this.minDate.setMonth(prevMonth);
        this.minDate.setFullYear(prevYear);
        this.maxDate = new Date();
        this.maxDate.setMonth(nextMonth);
        this.maxDate.setFullYear(nextYear);

        let invalidDate = new Date();
        invalidDate.setDate(today.getDate() - 1);
        this.invalidDates = [today,invalidDate];
	}

	public languageChangeEvent(event: any): void {
		this.zone.run(() => {
			this.i18nService.use(event.id).subscribe();
		});
	}
}

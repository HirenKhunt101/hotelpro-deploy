/* eslint-disable @angular-eslint/no-output-on-prefix */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements OnChanges {
  @Input() tableData: any[] = [];
  @Input() columnArray: any[] = [];
  @Input() showActionBtn: boolean = false;

  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();

  filterData: any[] = [];
  searchbox: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableData']) {
      this.filterData = this.tableData;
    }
  }

  editRecord(item: any) {
    this.onEdit.emit(item);
  }

  deleteRecord(item: any) {
    this.onDelete.emit(item);
  }

  onChangeEvent(e: any) {
    console.log(e);
    this.filterData = this.tableData.filter((item) => {
      return item.name.toLowerCase().includes(e.toLowerCase());
    });
    console.log(this.filterData);
  }

  trackByFn(index: number, item: any): any {
    return item.id; // or any unique identifier of the item
  }
}

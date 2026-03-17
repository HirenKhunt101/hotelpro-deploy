import { Component, Input, OnInit } from '@angular/core';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'app-ag-grid-table',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './ag-grid-table.component.html',
  styleUrl: './ag-grid-table.component.css',
})
export class AgGridTableComponent implements OnInit {
  private gridApi!: GridApi<any>;

  userList: any[] = [];
  @Input() rowInputData: any[] = [];
  @Input() colLabels: any[] = [];
  public rowSelection: 'single' | 'multiple' = 'multiple';
  defaultColDef = {
    flex: 1,
    minWdith: 100,
  };

  constructor() {}

  ngOnInit(): void {
    console.log('ag grid');
  }
  onGridReady(event: GridReadyEvent<any>) {
    this.gridApi = event.api;
  }

  onBtExport() {
    this.gridApi.exportDataAsCsv();
  }
}

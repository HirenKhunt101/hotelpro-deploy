import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { CommonModule } from '@angular/common';
import { PropertySidebarComponent } from '../property-sidebar/property-sidebar.component';

@Component({
  selector: 'app-rooms-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PropertySidebarComponent,
  ],
  templateUrl: './rooms-review.component.html',
  styleUrls: ['./rooms-review.component.css'],
})
export class RoomsReviewComponent implements OnInit {
  columnArray: any[] = [];
  showActionBtn: boolean = true;
  filterData: any[] = [];
  searchbox: string = '';
  propertyUnitId: string | null = '';
  roomTypesForm!: FormGroup;
  expandedRowIndices: Set<number> = new Set<number>();

  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private activeRoute: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.propertyUnitId =
      this.activeRoute.snapshot.paramMap.get('propertyUnitId');
    this.roomTypesForm = this.fb.group({
      roomTypes: this.fb.array([]),
    });
    this.loadRoomTypes();
  }

  loadRoomTypes(): void {
    this.crudService
      .post(APIConstant.READ_ROOMTYPE_AND_ROOMS + this.propertyUnitId)
      .then((response: any) => {
        let sortedRoomTypeData = this.roomSort(response.data);
        for (let roomtype of sortedRoomTypeData) {
          this.addRoomType(roomtype);
        }
      })
      .catch((error: any) => {
        this.alertService.errorAlert(error?.error?.message);
        console.log(error);
      });
  }

  createRoom(r?: any): FormGroup {
    const roomform = this.fb.group({
      roomName: [r?.roomName || '', [Validators.required]],
      roomNumber: [
        r?.roomNumber || '',
        [Validators.required, Validators.pattern('^[0-9]*$')],
      ],
      roomId: [r?.roomId || ''],
      roomTypeId: [r?.roomTypeId || '', Validators.required],
    });
    if (r?.roomId) {
      roomform.disable();
    }
    return roomform;
  }

  addRoom(roomTypeIndex: number, room?: any): void {
    this.expandedRowIndices.add(roomTypeIndex);
    this.getRooms(roomTypeIndex).push(this.createRoom(room));
  }

  get roomTypes(): FormArray {
    return this.roomTypesForm.get('roomTypes') as FormArray;
  }

  createRoomType(roomType: any = {}): FormGroup {
    const roomTypeForm = this.fb.group({
      roomTypeId: [roomType.roomTypeId || '', Validators.required],
      roomTypeName: [roomType.roomTypeName || '', Validators.required],
      active: [roomType.active || false],
      roomTypeCategory: [
        roomType.roomTypeCategory || 'Room',
        Validators.required,
      ],
      description: [roomType.description || '', Validators.required],
      adultOccupancy: [
        roomType.adultOccupancy || 0,
        [Validators.min(1), Validators.required],
      ],
      childOccupancy: [roomType.childOccupancy || 0, Validators.required],
      totalrooms: [
        roomType.rooms?.length || 0,
        [Validators.min(1), Validators.required],
      ],
      rooms: this.fb.array([]),
    });

    if (roomType.rooms) {
      const roomsArray = roomTypeForm.get('rooms') as FormArray;
      for (let room of roomType.rooms) {
        roomsArray.push(this.createRoom(room));
      }
    }

    return roomTypeForm;
  }

  addRoomType(roomType?: any): void {
    this.roomTypes.push(this.createRoomType(roomType));
  }

  editRoomType(index: number, data: any): void {
    this.roomTypes.at(index).patchValue(data);
  }

  deleteRoomType(index: number): void {
    this.roomTypes.removeAt(index);
  }

  editRoom(roomTypeIndex: number, roomIndex: number, data: any): void {
    const room = this.getRooms(roomTypeIndex).at(roomIndex);
    const obj = room.value;
    const apiEndpoint = room.value.roomId
      ? APIConstant.UPDATE_ROOM + room.value.roomId
      : APIConstant.CREATE_ROOM;

    this.crudService
      .post(apiEndpoint, obj)
      .then((response: any) => {
        console.log(response);
        response.data.roomId = response.data._id;
        room.patchValue(response.data);
        room.disable();
        this.alertService.successAlert(response.message);
      })
      .catch((error: any) => {
        this.alertService.errorAlert(error?.error.message);
        console.log(error);
      });
  }

  deleteRoom(roomTypeIndex: number, roomIndex: number): void {
    const rooms = this.getRooms(roomTypeIndex);
    const roomId = rooms.at(roomIndex).value.roomId;
    if (roomId) {
      this.crudService
        .post(APIConstant.DELETE_ROOM + roomId)
        .then((response: any) => {
          console.log(response);
          rooms.removeAt(roomIndex);
          this.alertService.successAlert(response.message);
        })
        .catch((error: any) => {
          this.alertService.errorAlert(error.message);
          console.log(error);
        });
    } else {
      rooms.removeAt(roomIndex);
    }
  }

  trackByFn(index: number, item: any): any {
    return item.id || index; // Use unique identifier or index as fallback
  }

  getRooms(roomTypeIndex: number): FormArray {
    return this.roomTypes.at(roomTypeIndex).get('rooms') as FormArray;
  }

  toggleRow(index: number): void {
    this.expandedRowIndices.has(index)
      ? this.expandedRowIndices.delete(index)
      : this.expandedRowIndices.add(index);
  }

  isRowExpanded(index: number): boolean {
    return this.expandedRowIndices.has(index);
  }
  next() {
    this.router.navigate(['/policy-setup/', this.propertyUnitId]);
  }

  editPropertyUnit() {
    this.router.navigate(['/property-setup', this.propertyUnitId]);
  }

  roomSort(data: any) {
    for (let rt of data) {
      rt.rooms.sort((a: any, b: any) => {
        if (a.roomType < b.roomType) {
          return -1;
        }
        if (a.roomType > b.roomType) {
          return 1;
        }
        if (a.roomName < b.roomName) {
          return -1;
        }
        if (a.roomName > b.roomName) {
          return 1;
        }
        return 0;
      });
    }

    return data;
  }
}

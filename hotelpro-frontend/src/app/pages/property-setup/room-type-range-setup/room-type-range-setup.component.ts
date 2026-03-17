import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  AbstractControl,
  ValidatorFn,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  NgxFileDropEntry,
  FileSystemFileEntry,
  FileSystemDirectoryEntry,
  NgxFileDropModule,
} from 'ngx-file-drop';

@Component({
  selector: 'app-room-type-range-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgxFileDropModule,
  ],
  templateUrl: './room-type-range-setup.component.html',
  styleUrls: ['./room-type-range-setup.component.css'],
})
export class RoomTypeRangeSetupComponent implements OnInit {
  roomTypeForm!: FormGroup;
  propertyUnitId: string | null = '';
  roomTypeId: string = 'ADD';
  roomCount: number = 0;
  roomTypeImages: any[] = [];

  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private activeRoute: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.propertyUnitId =
      this.activeRoute.snapshot.paramMap.get('propertyUnitId');
    this.roomTypeId = String(
      this.activeRoute.snapshot.paramMap.get('roomTypeId')
    );

    this.roomTypeForm = this.fb.group(
      {
        roomTypeName: ['', Validators.required],
        active: [true],
        // roomTypeCategory: ['Room', Validators.required],
        description: [''],
        adultOccupancy: [0, [Validators.min(1), Validators.required]],
        childOccupancy: [0, [Validators.min(0), Validators.required]],
        baseRate: [0],
        rooms: this.fb.array([]),
      },
      { validators: [this.totalRoomsValidator(), this.noOverlappingRanges()] }
    );

    if (this.roomTypeId && this.roomTypeId != 'ADD') {
      this.crudService
        .post(APIConstant.READ_ROOMTYPE_BY_ID + this.roomTypeId)
        .then((response: any) => {
          console.log(response);
          this.roomTypeForm.reset(response.data);
          this.roomTypeImages = response.data.images;
          // this.alertService.successAlert(response.message);
        })
        .catch((error: any) => {
          this.alertService.errorAlert(error.message);
          this.router.navigate([
            '/roomtype-setup/' + this.propertyUnitId + '/ADD',
          ]);
          this.ngOnInit();
        });
    } else {
      this.roomTypeForm.addControl(
        'totalrooms',
        this.fb.control(0, [Validators.min(1), Validators.required])
      );
    }
  }

  get rooms(): FormArray {
    return this.roomTypeForm.get('rooms') as FormArray;
  }

  createRoomGroup(data?: any): FormGroup {
    return this.fb.group({
      prefix: [data?.prefix || ''],
      start: [data?.start || 0, Validators.required],
      end: [data?.end || 0, Validators.required],
    });
  }

  addRoom(data?: any) {
    this.rooms.push(this.createRoomGroup(data));
  }

  onSubmit() {
    if (this.roomTypeForm.valid) {
      console.log(this.roomTypeForm.value);
      // Handle the form submission logic here

      if (this.roomTypeId == 'ADD') {
        this.crudService
          .post(
            APIConstant.CREATE_ROOMTYPE_AND_ROOMS + this.propertyUnitId,
            this.roomTypeForm.value
          )
          .then((response: any) => {
            console.log(response);
            this.alertService.successAlert(response.message);
            this.navigateToRoomReview();
          })
          .catch((error: any) => {
            this.alertService.errorAlert(error.message);
          });
      } else {
        this.crudService
          .post(
            APIConstant.UPDATE_ROOM_TYPE + this.roomTypeId,
            this.roomTypeForm.value
          )
          .then((response: any) => {
            console.log(response);
            this.alertService.successAlert(response.message);
            this.navigateToRoomReview();
          })
          .catch((error: any) => {
            this.alertService.errorAlert(error.message);
          });
      }
    } else {
      this.roomTypeForm.markAllAsTouched();
    }
  }

  removeRoom(index: number) {
    this.rooms.removeAt(index);
  }

  totalRoomsValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const totalRooms = control.get('totalrooms')?.value;
      const roomsArray = control.get('rooms') as FormArray;

      if (!totalRooms || !roomsArray) {
        return null;
      }

      let roomCount = 0;

      roomsArray.controls.forEach((roomGroup) => {
        const start = parseInt(roomGroup.get('start')?.value, 10);
        const end = parseInt(roomGroup.get('end')?.value, 10);
        if (start && end) {
          roomCount += end - start + 1;
        }
      });
      this.roomCount = roomCount;
      return roomCount === totalRooms ? null : { totalRoomsMismatch: true };
    };
  }

  noOverlappingRanges(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const roomsArray = control.get('rooms') as FormArray;

      if (!roomsArray) {
        return null;
      }

      const ranges: { start: number; end: number }[] = [];

      let hasOverlap = false;

      roomsArray.controls.forEach((roomGroup) => {
        const start = parseInt(roomGroup.get('start')?.value, 10);
        const end = parseInt(roomGroup.get('end')?.value, 10);

        if (start && end) {
          for (let range of ranges) {
            if (
              (start >= range.start && start <= range.end) ||
              (end >= range.start && end <= range.end) ||
              (start <= range.start && end >= range.end)
            ) {
              hasOverlap = true;
              break;
            }
          }

          ranges.push({ start, end });
        }
      });

      return hasOverlap ? { overlappingRanges: true } : null;
    };
  }

  navigateToRoomReview() {
    this.router.navigate(['/rooms-review', this.propertyUnitId]);
  }

  dropped(files: NgxFileDropEntry[]): void {
    const formData = new FormData();
    if (
      5 - this.roomTypeImages?.length > 0 &&
      5 - this.roomTypeImages?.length >= files.length
    ) {
      files.forEach((fileEntry, index) => {
        if (fileEntry.fileEntry.isFile) {
          const entry = fileEntry.fileEntry as FileSystemFileEntry;
          entry.file((file: File) => {
            formData.append('uploadedImages', file, fileEntry.relativePath);

            // Once all files are processed, send the upload request
            if (index === files.length - 1) {
              formData.append('_id', this.roomTypeId);
              this.uploadPhotos(formData);
            }
          });
        } else {
          // Handle directories if needed
          const dirEntry = fileEntry.fileEntry as FileSystemDirectoryEntry;
          console.log(fileEntry.relativePath, dirEntry);
        }
      });
    } else {
      this.alertService.errorAlert(
        'you reach your limit of upload images,maximum 5 images allowed per room type !'
      );
    }
  }

  uploadPhotos(formData: FormData) {
    this.crudService
      .post(APIConstant.UPLOAD_ROOMTYPE_IMAGES, formData)
      .then((response) => {
        const uploadedImages = response?.data?.images || [];
        if (uploadedImages.length) {
          this.roomTypeImages = [...this.roomTypeImages, ...uploadedImages];
        }
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred '
        );
        console.error(error);
      });
  }

  deletePhotos(imageUrl: any) {
    this.crudService
      .post(APIConstant.DELETE_ROOMTYPE_IMAGES, {
        imageUrl,
        _id: this.roomTypeId,
      })
      .then((response) => {
        this.roomTypeImages = this.roomTypeImages.filter(
          (doc: string) => doc !== imageUrl
        );
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred '
        );
        console.error(error);
      });
  }
}

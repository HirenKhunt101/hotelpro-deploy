import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { NgxFileDropEntry, NgxFileDropModule } from 'ngx-file-drop';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [NgxFileDropModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
})
export class FileUploadComponent {
  @Input() multiple: boolean = true;
  @Input() acceptTypes: string = '.jpg, .jpeg, .png, .JPG, .JPEG, .PNG';
  @Input() maxFileSize: number = 2000000; // 2 MB

  @Output() onUpload = new EventEmitter<File[]>();

  fileError = '';
  filePreviews: string[] = [];
  files: File[] = [];

  public droppedFiles(files: NgxFileDropEntry[]) {
    this.clearErrors();

    if (!this.multiple && files.length > 1) {
      this.fileError = 'Only one file is allowed.';
      return;
    }

    this.files = [];
    this.filePreviews = [];
    for (const droppedFile of files) {
      if (
        droppedFile.fileEntry.isFile &&
        this.isFileAllowed(droppedFile.fileEntry.name)
      ) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          if (this.isFileSizeAllowed(file.size)) {
            this.files.push(file);
            this.generatePreview(file);
          } else {
            this.fileError = 'Max size of a file allowed is 2 MB.';
          }
        });
      } else {
        this.fileError =
          "Only files in '.jpg', '.jpeg', '.png' format are accepted.";
      }
    }
  }

  isFileAllowed(fileName: string): boolean {
    const allowedFiles = this.acceptTypes.split(',').map((ext) => ext.trim());
    const extension = fileName
      .substring(fileName.lastIndexOf('.'))
      .toLowerCase();
    return allowedFiles.includes(extension);
  }

  isFileSizeAllowed(size: number): boolean {
    return size <= this.maxFileSize;
  }

  generatePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.filePreviews.push(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  removeFile(index: number) {
    this.filePreviews.splice(index, 1);
    this.files.splice(index, 1);
  }

  uploadFiles() {
    if (this.files.length === 0) {
      this.fileError = 'No files to upload.';
      return;
    }
    this.onUpload.emit(this.files);
  }

  clearErrors() {
    this.fileError = '';
  }

  clearFiles() {
    this.filePreviews = [];
    this.files = [];
  }
}

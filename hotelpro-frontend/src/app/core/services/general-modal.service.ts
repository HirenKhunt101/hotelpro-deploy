import { Injectable } from '@angular/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { GeneralModalComponent } from '../reused/general-modal/general-modal.component';

@Injectable({
  providedIn: 'root',
})
export class GeneralModalService {
  constructor(private modalService: NgbModal) {}

  openModal(
    headerMessage: string = '',
    message: string,
    type: 'success' | 'error' | 'confirmation' = 'confirmation',
    size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
    options?: NgbModalOptions
  ): Promise<boolean> {
    const modalRef = this.modalService.open(GeneralModalComponent, {
      size,
      ...options,
      backdropClass: type !== 'confirmation' ? 'backdroptrans' : '',
    });
    modalRef.componentInstance.headerMessage = headerMessage;
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = type;
    return modalRef.result;
  }
}

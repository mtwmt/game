import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'auto' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalType = 'card' | 'hero';

interface ModalStyles {
  backdrop: string;
  modal: string;
  header: string;
  title: string;
  content: string;
  footer: string;
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  isOpen = input.required<boolean>();
  title = input<string>();
  size = input<ModalSize>('auto');
  type = input<ModalType>('hero');
  showCloseButton = input<boolean>(true);
  closeOnBackdrop = input<boolean>(true);
  hasFooter = input<boolean>(false);
  theme = input<string>('amber'); // 支援 amber, red, orange, lime, yellow, green 等主題

  close = output<void>();

  private readonly modalStyles: Record<ModalType, ModalStyles> = {
    card: {
      backdrop: 'bg-black/50',
      modal: 'bg-neutral-900 border border-neutral-700 shadow-lg max-h-[70vh]',
      header: 'border-b border-neutral-700',
      title: 'text-amber-400',
      content: 'p-4 overflow-y-auto max-h-[50vh]',
      footer: 'border-t border-neutral-700 text-center',
    },
    hero: {
      backdrop: 'bg-black/50 backdrop-blur-sm',
      modal: 'shadow-2xl text-center',
      header: '',
      title: 'text-2xl font-bold mb-2',
      content: '', // 動態生成主題色
      footer: '',
    },
  };

  private getModalStyles(): ModalStyles {
    const currentType = this.type();
    console.log('Raw type value:', currentType);
    console.log('Type of type:', typeof currentType);
    console.log('Available styles keys:', Object.keys(this.modalStyles));
    console.log('Type exists in styles?', currentType in this.modalStyles);

    return this.modalStyles[currentType] || this.modalStyles.hero;
  }

  protected onClose() {
    this.close.emit();
  }

  protected onBackdropClick() {
    if (this.closeOnBackdrop()) {
      this.close.emit();
    }
  }

  protected getBackdropClass(): string {
    return this.getModalStyles().backdrop;
  }

  protected getModalClass(): string {
    const sizeClass = this.getSizeClass();
    const modalStyle = this.getModalStyles().modal;
    return `${modalStyle} ${sizeClass}`.trim();
  }

  protected getSizeClass(): string {
    const sizeMap = {
      auto: '',
      sm: 'max-w-sm w-full',
      md: 'max-w-md w-full',
      lg: 'max-w-lg w-full',
      xl: 'max-w-xl w-full',
      full: 'w-full h-full max-w-none max-h-none',
    };
    return sizeMap[this.size()];
  }

  protected getHeaderClass(): string {
    return this.getModalStyles().header;
  }

  protected getTitleClass(): string {
    return this.getModalStyles().title;
  }

  protected getContentClass(): string {
    const styles = this.getModalStyles();
    const theme = this.theme();

    if (this.type() === 'card') {
      const hasHeader = this.title() || this.showCloseButton();
      const paddingTop = hasHeader ? '' : 'pt-4';
      return `${styles.content} ${paddingTop}`.trim();
    }

    return `bg-gradient-to-br from-${theme}-600 to-${theme}-800 border-2 border-${theme}-400 rounded-lg p-8`;
  }

  protected getFooterClass(): string {
    return this.getModalStyles().footer;
  }
}

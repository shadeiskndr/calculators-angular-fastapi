import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-footer",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-surface-0 dark:bg-surface-900 p-6 rounded-2xl max-w-7xl mx-auto border border-surface-200 dark:border-surface-700 w-full"
    >
      <div class="flex justify-between items-center sm:flex-row flex-col gap-2">
        <div class="text-sm text-surface-600 dark:text-surface-400">
          2025 | Shahathir Iskandar
        </div>
        <div class="flex gap-4">
          <a
            href="https://linkedin.com/in/shahathir-iskandar"
            target="_blank"
            rel="noopener noreferrer"
            class="text-surface-600 dark:text-surface-400 hover:text-primary transition-colors text-sm"
          >
            <i class="pi pi-linkedin text-xl"></i>
          </a>
          <a
            href="https://shahathir.me"
            target="_blank"
            rel="noopener noreferrer"
            class="text-surface-600 dark:text-surface-400 hover:text-primary transition-colors text-sm"
          >
            <i class="pi pi-globe text-xl"></i>
          </a>
          <a
            href="https://github.com/shadeiskndr"
            target="_blank"
            rel="noopener noreferrer"
            class="text-surface-600 dark:text-surface-400 hover:text-primary transition-colors text-sm"
          >
            <i class="pi pi-github text-xl"></i>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AppFooter {}

import { Component } from "@angular/core";
import { InputTextModule } from "primeng/inputtext";
import { FormsModule } from "@angular/forms";
import { IftaLabelModule } from "primeng/iftalabel";

@Component({
  selector: "input-text-iftalabel-demo",
  template: `<div class="card flex justify-center">
    <p-iftalabel>
      <input pInputText id="username" [(ngModel)]="value" autocomplete="off" />
      <label for="username">Username</label>
    </p-iftalabel>
  </div>`,
  standalone: true,
  imports: [FormsModule, InputTextModule, IftaLabelModule],
})
export class InputTextIftaLabelDemo {
  value: string | undefined;
}

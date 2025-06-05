import { Component } from "@angular/core";
import { InputIconModule } from "primeng/inputicon";
import { IconFieldModule } from "primeng/iconfield";
import { InputTextModule } from "primeng/inputtext";
import { FormsModule } from "@angular/forms";
import { IftaLabelModule } from "primeng/iftalabel";

@Component({
  selector: "iconfield-ifta-label-demo",
  template: `
    <div class="card flex justify-center">
      <p-iftalabel>
        <p-iconfield>
          <p-inputicon class="pi pi-user" />
          <input
            pInputText
            id="username"
            [(ngModel)]="value"
            autocomplete="off"
          />
        </p-iconfield>
        <label for="username">Username</label>
      </p-iftalabel>
    </div>
  `,
  standalone: true,
  imports: [
    InputIconModule,
    IconFieldModule,
    InputTextModule,
    IftaLabelModule,
    FormsModule,
  ],
})
export class IconFieldIftaLabelDemo {
  value: string | undefined;
}

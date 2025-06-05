import { Component } from "@angular/core";
import { Textarea } from "primeng/inputtextarea";
import { FormsModule } from "@angular/forms";
import { IftaLabelModule } from "primeng/iftalabel";

@Component({
  selector: "input-textarea-iftalabel-demo",
  template: `<div class="card flex justify-center">
    <p-iftalabel>
      <textarea
        pTextarea
        id="description"
        [(ngModel)]="value"
        rows="5"
        cols="30"
        style="resize: none"
      ></textarea>
      <label for="description">Description</label>
    </p-iftalabel>
  </div>`,
  standalone: true,
  imports: [FormsModule, Textarea, IftaLabelModule],
})
export class TextareaIftaLabelDemo {
  value: string = "";
}

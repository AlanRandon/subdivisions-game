import { LitElement } from "lit";

export class LitElementNoShadow extends LitElement {
  createRenderRoot() {
    return this;
  }
}

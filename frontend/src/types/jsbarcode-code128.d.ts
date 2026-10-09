// jsbarcode only ships types for its DOM entry point. The Code 128 encoder on
// its own is enough to draw the bars as React SVG.
declare module "jsbarcode/bin/barcodes/CODE128" {
  export class CODE128 {
    constructor(data: string, options: object)
    valid(): boolean
    encode(): { text: string; data: string }
  }
}

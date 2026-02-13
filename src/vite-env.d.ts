/// <reference types="vite/client" />

declare module 'mammoth' {
  interface ConversionResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>;
  function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>;
  export default { convertToHtml, extractRawText };
}

declare module 'html2canvas' {
  interface Options {
    scale?: number;
    useCORS?: boolean;
    backgroundColor?: string;
    width?: number;
    height?: number;
  }
  function html2canvas(element: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
  export default html2canvas;
}

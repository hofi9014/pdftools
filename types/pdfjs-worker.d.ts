declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  const WorkerMessageHandler: {
    setup: (handler: unknown, port: unknown) => void;
    initializeFromPort: (port: unknown) => void;
  };
  export { WorkerMessageHandler };
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  const WorkerMessageHandler: {
    setup: (handler: unknown, port: unknown) => void;
    initializeFromPort: (port: unknown) => void;
  };
  export { WorkerMessageHandler };
}

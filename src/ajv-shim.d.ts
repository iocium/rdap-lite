// Shim for Ajv module when runtime dependency is external
declare module 'ajv' {
  // Minimal Ajv interface for bootstrap validation
  interface ValidateFunction {
    (data: any): data is any;
    errors?: Array<{ instancePath: string; message?: string }> | null;
  }
  interface AjvOptions {
    strict?: boolean;
    [key: string]: any;
  }
  class Ajv {
    constructor(options?: AjvOptions);
    compile(schema: object): ValidateFunction;
  }
  export default Ajv;
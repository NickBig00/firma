export type Suchparameter = {
  readonly name?: string;
  readonly branche?: string;
  readonly ort?: string;
  readonly gruendungsjahr?: number | string;
  readonly mitarbeiteranzahl?: number | string;
  readonly umsatz?: number | string;
  readonly homepage?: string;
  readonly geschaeftsfuehrer?: string;
};

export const suchparameterNamen = [
  'name',
  'branche',
  'ort',
  'gruendungsjahr',
  'mitarbeiteranzahl',
  'umsatz',
  'homepage',
  'geschaeftsfuehrer',
];

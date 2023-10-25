export enum JSONLineType {
  OpenArray,
  OpenObject,
  CloseArray,
  CloseObject,
  Property,
  Error,
  Loading,
}

export type JSONLine =
  | {
      type: JSONLineType.Property;
      level: number;
      key?: string | number | null;
      value: JSONPrimitive;
    }
  | {
      type: JSONLineType.OpenObject | JSONLineType.OpenArray;
      level: number;
      key: string | number | null;
      container: JSONLineType.OpenArray | JSONLineType.OpenObject | null;
    }
  | {
      type: JSONLineType.CloseArray | JSONLineType.CloseObject;
      level: number;
    }
  | {
      type: JSONLineType.Error;
      level: number;
      message: string;
    }
  | {
      type: JSONLineType.Loading;
      level: number;
      width: number;
    };

// type: JSONLineType;
// level: number;
// key: string | null;
// value?: JSONPrimitive;
// container: JSONLineType.OpenArray | JSONLineType.OpenObject | null;
// };

export type ParserErrorType = {
  type: 'invalid-file' | 'unexpected';
  message: string;
};

export type JSONPrimitive = null | string | number | boolean;

export type JsonStreamChunk = {
  lines: Array<JSONLine>;
  error: ParserErrorType | null;
  stats: {
    processedBytes: number;
    chunkIndex: number;
  };
};

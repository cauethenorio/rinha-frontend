import { JsonHigh } from '@xtao-org/jsonhilo';

import {
  JSONLine,
  JSONLineType,
  JSONPrimitive,
  ParserErrorType,
} from '../types.ts';

type ReaderPositionStats = {
  col: number;
  line: number;
  pos: number;
};

export type JsonHiloErrorType =
  | ({
      type: 'JsonFeedbackType.error';
      errorType: 'JsonErrorType.unexpected';
      codePoint: number;
      context: string;
      expected: Array<string>;
    } & ReaderPositionStats)
  | ({
      type: 'JsonFeedbackType.error';
      errorType: 'JsonErrorType.unexpectedEnd';
      context: string;
      expected: Array<string>;
    } & ReaderPositionStats);

export class JsonTokens2Lines {
  /*
    Converts a stream of JSON tokens to a stream of lines
    which can be rendered in the DOM
  */

  private reader;

  private currentLevel = -1;
  private path: Array<JSONLineType.OpenArray | JSONLineType.OpenObject> = [];
  private arraysIndexes: Array<number> = [];
  private currentKey: string | null = null;
  private linesBuffer: Array<JSONLine> | null = null;
  private currentContainer:
    | JSONLineType.OpenArray
    | JSONLineType.OpenObject
    | null = null;

  constructor() {
    this.reader = JsonHigh({
      openArray: this.handleOpenArray.bind(this),
      openObject: this.handleOpenObject.bind(this),
      closeArray: this.handleClose.bind(this),
      closeObject: this.handleClose.bind(this),
      key: this.handleKey.bind(this),
      value: this.handleValue.bind(this),
    });
  }

  public convertChunk(chunk: string): {
    lines: Array<JSONLine>;
    error: ParserErrorType | null;
  } {
    let error: ParserErrorType | null = null;

    const lines = this.withCleanBuffer(() => {
      try {
        this.reader.chunk(chunk);
      } catch (e) {
        error = this.captureErrorAsLine(JSON.parse((e as Error).message));
      }
    });

    return { lines, error };
  }

  end(): {
    lines: Array<JSONLine>;
    error: ParserErrorType | null;
  } {
    let error: ParserErrorType | null = null;

    const lines = this.withCleanBuffer(() => {
      const endStats = this.reader.end() as
        | JsonHiloErrorType
        | ReaderPositionStats;

      if ('errorType' in endStats) {
        error = this.captureErrorAsLine(endStats);
      }
    });

    return { lines, error };
  }

  private withCleanBuffer(fn: () => void) {
    this.linesBuffer = [];
    fn();
    const lines = this.linesBuffer;
    // always clean the buffer after using it to avoid memory leaks
    this.linesBuffer = [];
    return lines;
  }

  private _handleOpen(type: JSONLineType.OpenArray | JSONLineType.OpenObject) {
    const key = this.calculateCurrentKey();

    if (key || this.currentContainer === JSONLineType.OpenArray) {
      // rinha-specific: hide { when there's no key
      this.linesBuffer!.push({
        type,
        level: this.currentLevel,
        key,
        container: this.currentContainer,
      });
    }

    this.currentLevel++;

    this.path.push(type);
    this.currentContainer = type;
  }

  private handleOpenArray() {
    this._handleOpen(JSONLineType.OpenArray);
    this.arraysIndexes.push(0);
  }

  handleOpenObject() {
    this._handleOpen(JSONLineType.OpenObject);
  }

  handleClose() {
    this.currentLevel--;
    this.currentContainer = this.path.pop()!;

    if (this.currentContainer === JSONLineType.OpenArray) {
      this.arraysIndexes.pop();
    }

    // rinha-specific: hide }
    if (this.currentContainer === JSONLineType.OpenArray) {
      this.linesBuffer!.push({
        type: JSONLineType.CloseArray,
        level: this.currentLevel,
      });
    }
  }

  handleKey(key: string) {
    this.currentKey = key;
  }

  handleValue(value: JSONPrimitive) {
    const key = this.calculateCurrentKey();

    if (typeof value === 'string') {
      value = `"${value}"`;
    }

    this.linesBuffer!.push({
      type: JSONLineType.Property,
      level: this.currentLevel,
      key,
      value,
    });
  }

  private calculateCurrentKey() {
    let key: string | number | null = this.currentKey;
    this.currentKey = null;

    if (!key) {
      key = this.arraysIndexes[this.arraysIndexes.length - 1];
      this.arraysIndexes[this.arraysIndexes.length - 1]++;
    }

    return key ?? '';
  }

  private captureErrorAsLine(e: JsonHiloErrorType): ParserErrorType {
    const error = getFriendlyErrorFromJsonHiloError(e);

    this.linesBuffer!.push({
      type: JSONLineType.Error,
      level: this.currentLevel,
      message: error.message,
    });
    return error;
  }
}

function getFriendlyErrorFromJsonHiloError(
  e: JsonHiloErrorType,
): ParserErrorType {
  if (e.type === 'JsonFeedbackType.error' && e.pos === 0) {
    return {
      type: 'invalid-file',
      message: 'Invalid file. Please load a valid JSON file',
    };
  }

  if (e.errorType === 'JsonErrorType.unexpected') {
    return {
      type: 'unexpected',
      message: `Unexpected token "${String.fromCodePoint(e.codePoint).replace(
        '\n',
        '\\n',
      )}" ${e.context} at line ${e.line}, column ${
        e.col
      }. Expected: ${e.expected.join(', ')}`,
    };
  }

  if (e.errorType === 'JsonErrorType.unexpectedEnd') {
    return {
      type: 'unexpected',
      message: `Unexpected end of input at line ${e.line}, column ${e.col}. ${e.context}`,
    };
  }

  return {
    type: 'unexpected',
    message: `Unexpected error: ${e}`,
  };
}

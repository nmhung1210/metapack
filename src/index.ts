import { Buffer } from "buffer/index";

export enum DataTypes {
  UINT8 = 0,
  UINT16,
  UINT32,
  UINT64,
  INT8,
  INT16,
  INT32,
  INT64,
  BOOL,
  FLOAT,
  BINARY,
  STRING,
  OBJECT,
}

export const {
  UINT8,
  UINT16,
  UINT32,
  UINT64,
  INT8,
  INT16,
  INT32,
  INT64,
  BOOL,
  FLOAT,
  BINARY,
  STRING,
  OBJECT,
} = DataTypes;

export type Schema =
  | DataTypes
  | DataTypes[]
  | { [name: string]: Schema | Schema[] | Schema[] };

const CHUNK_SIZE = 10240;
export const pack = (data: any, dataSchema: Schema) => {
  let buff = Buffer.alloc(CHUNK_SIZE);
  let pos = 0;
  const prepare = (size: number) => {
    if (buff.byteLength <= pos + size) {
      const incsize = size + CHUNK_SIZE;
      buff = Buffer.alloc(buff.length + incsize, buff);
    }
  };
  const doPack = (data: any, schema: Schema) => {
    if (typeof schema === "number") {
      prepare(8);
      switch (schema) {
        case UINT8:
        case BOOL:
          pos = buff.writeUInt8(data, pos);
          break;
        case INT8:
          pos = buff.writeInt8(data, pos);
          break;
        case UINT16:
          pos = buff.writeUInt16BE(data, pos);
          break;
        case INT16:
          pos = buff.writeInt16BE(data, pos);
          break;
        case UINT32:
          pos = buff.writeUInt32BE(data, pos);
          break;
        case INT32:
          pos = buff.writeInt32BE(data, pos);
          break;
        case UINT64:
          pos = buff.writeBigUInt64BE(data, pos) as any;
          break;
        case INT64:
          pos = buff.writeBigInt64BE(data, pos) as any;
          break;
        case FLOAT:
          pos = buff.writeFloatBE(data, pos);
          break;
        case BINARY:
        case STRING: {
          const strBuff = Buffer.from(data);
          prepare(strBuff.length + 8);
          pos = buff.writeInt32BE(strBuff.length, pos);
          pos += strBuff.copy(buff, pos);
          break;
        }
        case OBJECT: {
          const strBuff = Buffer.from(JSON.stringify(data));
          prepare(strBuff.length + 8);
          pos = buff.writeInt32BE(strBuff.length, pos);
          pos += strBuff.copy(buff, pos);
          break;
        }
      }
    } else if (Array.isArray(schema)) {
      prepare(4);
      pos = buff.writeUInt32BE(data.length, pos);
      data.forEach((itemdata: any, i: number) => {
        const itemschema = schema[i % schema.length];
        doPack(itemdata, itemschema);
      });
    } else if (typeof schema === "object") {
      for (const key in schema) {
        doPack(data[key], (schema as { [name: string]: Schema })[key]);
      }
    }
  };
  doPack(data, dataSchema);
  return buff.slice(0, pos);
};

export const unpack = (data: Buffer | ArrayBuffer | string, schema: Schema) => {
  const buff = data instanceof Buffer ? data : Buffer.from(data as any);
  let pos = 0;
  const inc = (size: number) => {
    pos += size;
  };
  const doUnpack = (schema: Schema) => {
    if (typeof schema === "number") {
      let val: any;
      switch (schema) {
        case UINT8:
          val = buff.readUInt8(pos);
          inc(1);
          break;
        case INT8:
          val = buff.readInt8(pos);
          inc(1);
          break;
        case BOOL:
          val = !!buff.readUInt8(pos);
          inc(1);
          break;
        case UINT16:
          val = buff.readUInt16BE(pos);
          inc(2);
          break;
        case INT16:
          val = buff.readInt16BE(pos);
          inc(2);
          break;
        case UINT32:
          val = buff.readUInt32BE(pos);
          inc(4);
          break;
        case INT32:
          val = buff.readInt32BE(pos);
          inc(4);
          break;
        case UINT64:
          val = buff.readBigUInt64BE(pos);
          inc(8);
          break;
        case INT64:
          val = buff.readBigInt64BE(pos);
          inc(8);
          break;
        case FLOAT:
          val = buff.readFloatBE(pos);
          inc(4);
          break;
        case BINARY:
          const length = buff.readUInt32BE(pos);
          inc(4);
          val = buff.slice(pos, pos + length);
          inc(length);
          break;
        case STRING: {
          const length = buff.readUInt32BE(pos);
          inc(4);
          val = buff.slice(pos, pos + length).toString();
          inc(length);
          break;
        }
        case OBJECT: {
          const length = buff.readUInt32BE(pos);
          inc(4);
          val = JSON.parse(buff.slice(pos, pos + length).toString());
          inc(length);
          break;
        }
      }
      return val;
    }

    if (Array.isArray(schema)) {
      const length = buff.readUInt32BE(pos);
      inc(4);
      let val: any[] = [];
      for (let i = 0; i < length; ++i) {
        val.push(doUnpack(schema[i % schema.length]));
      }
      return val;
    }
    if (typeof schema === "object") {
      let val: any = {};
      for (const key in schema) {
        val[key] = doUnpack(schema[key] as Schema);
      }
      return val;
    }
    return undefined;
  };
  return doUnpack(schema);
};

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


export interface IPackConfig {
  chunkSize: number;
  useEncrypt: boolean;
  useCheckSum: boolean;
  secret: number;

}
export interface IPackConfigOptions {
  chunkSize?: number;
  useEncrypt?: boolean;
  useCheckSum?: boolean;
  secret?: number;
}

const defaultConfig: IPackConfig = {
  chunkSize: 10240,
  useEncrypt: true,
  useCheckSum: true,
  secret: 1210
};

export const pack = (data: any, dataSchema: Schema | Array<Schema>, opt?: IPackConfigOptions) => {
  const conf = Object.assign({}, defaultConfig, opt || {});
  let buff = Buffer.alloc(conf.chunkSize);
  let pos = 0;
  const prepare = (size: number) => {
    if (buff.byteLength <= pos + size) {
      const incsize = size + conf.chunkSize;
      buff = Buffer.alloc(buff.length + incsize, buff);
    }
  };
  const doPack = (data: any, schema: Schema | Array<Schema>) => {
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
  if (conf.useCheckSum || conf.useEncrypt) {
    let checksum = 0;
    for (let i = 0; i < pos; i++) {
      checksum += buff[i];
      if (conf.useEncrypt) {
        buff[i] = buff[i] + i + conf.secret;
      }
    }
    if (conf.useCheckSum) {
      pos = buff.writeInt16BE(checksum % 32000, pos);
    }
  }
  return buff.slice(0, pos);
};

export const unpack = <T = any>(
  data: ArrayBufferLike | ArrayBuffer | Uint8Array | string,
  schema: Schema | Array<Schema>,
  opt?: IPackConfigOptions
): T => {
  const conf = Object.assign({}, defaultConfig, opt || {});
  const buff = data instanceof Buffer ? data : Buffer.from(data as any);
  if (!buff || buff.length < 2) {
    throw new Error("Invalid package!");
  }
  let pos = 0;
  const inc = (size: number) => {
    pos += size;
  };
  if (conf.useCheckSum || conf.useEncrypt) {
    let checksum = 0;
    for (let i = 0; i < buff.length - 2; i++) {
      if (conf.useEncrypt) {
        buff[i] = buff[i] - i - conf.secret;
      }
      checksum += buff[i];
    }
    checksum = checksum % 32000;
    if (conf.useCheckSum) {
      const validchecksum = buff.readInt16BE(buff.length - 2);
      if (checksum !== validchecksum) {
        throw new Error("Data mismatch!");
      }
    }
  }
  const doUnpack = (schema: Schema | Array<Schema>) => {
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

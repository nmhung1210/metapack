import {
  BINARY,
  BOOL,
  INT16,
  INT32,
  INT64,
  INT8,
  OBJECT,
  pack,
  Schema,
  STRING,
  UINT16,
  UINT32,
  UINT64,
  UINT8,
  unpack,
} from "./index";
import expect from "expect";

describe("MetaPack test", () => {
  it("should return the same value that was unpacked from a packed", () => {
    expect(unpack(pack(100, UINT8), UINT8)).toBe(100);
    expect(unpack(pack(100, INT8), INT8)).toBe(100);
    expect(unpack(pack(10000, UINT16), UINT16)).toBe(10000);
    expect(unpack(pack(4000, INT16), INT16)).toBe(4000);
    expect(unpack(pack(2000000000, INT32), INT32)).toBe(2000000000);
    expect(unpack(pack(true, BOOL), BOOL)).toBe(true);
    expect(unpack(pack(false, BOOL), BOOL)).toBe(false);

    expect(unpack(pack(Buffer.from("abc"), BINARY), BINARY).toString()).toBe(
      "abc"
    );
    expect(unpack(pack("abc", STRING), STRING)).toBe("abc");
    expect(unpack(pack({ abc: 100 }, OBJECT), OBJECT)).toEqual({ abc: 100 });

    expect(unpack(pack(BigInt("10000000000"), UINT64), UINT64).toString()).toBe(
      "10000000000"
    );
    expect(unpack(pack(BigInt("-10000000000"), INT64), INT64).toString()).toBe(
      "-10000000000"
    );
  });
  it("should return the same array value that was unpacked from a packed", () => {
    expect(
      unpack(pack([100, 200, 50], [UINT8, INT16]), [UINT8, INT16])
    ).toEqual([100, 200, 50]);
  });

  it("should return the same array value that was unpacked from a packed", () => {
    expect(
      unpack(
        pack(
          {
            aaa: {
              bbb: {
                ccc: {
                  ddd: 100,
                  eee: [{ fff: 100 }, { hhh: 200 }],
                },
              },
            },
          },
          {
            aaa: {
              bbb: {
                ccc: {
                  ddd: INT32,
                  eee: [
                    {
                      fff: UINT16,
                    },
                    {
                      hhh: UINT32,
                    },
                  ],
                },
              },
            },
          }
        ),
        {
          aaa: {
            bbb: {
              ccc: {
                ddd: INT32,
                eee: [
                  {
                    fff: UINT16,
                  },
                  {
                    hhh: UINT32,
                  },
                ],
              },
            },
          },
        }
      )
    ).toEqual({
      aaa: {
        bbb: {
          ccc: {
            ddd: 100,
            eee: [{ fff: 100 }, { hhh: 200 }],
          },
        },
      },
    });
  });

  it("should return the same object that was unpacked from a packed", () => {
    const schema: Schema = {
      aaa: [UINT16],
      obj1: {
        obj11: UINT16,
        obj4: [INT8],
      },
    };
    const value = {
      aaa: [1],
      obj1: {
        obj11: 2,
        obj4: [2],
      },
    };
    expect(unpack(pack(value, schema), schema)).toEqual(value);
  });

  console.log(unpack(pack({ abc: 100 }, OBJECT), OBJECT));
});

// pack simple object
const profile = {
  userId: 101,
  nickName: "ABC",
  isVip: true,
  age: 34,
};
const profileSchema = {
  userId: UINT32,
  nickName: STRING,
  isVip: BOOL,
  age: UINT8,
};
const packedBuffer = pack(profile, profileSchema);

const unpackedProfile = unpack(packedBuffer, profileSchema);
console.log(profile, unpackedProfile);


// To pack list of profiles
const listProfiles = [profile, profile, profile];
const listProfileSchema = [profileSchema];

const packedListProfile = pack(listProfiles, listProfileSchema);
const unpackedListProfile = unpack(packedListProfile, listProfileSchema);

console.log(listProfiles, unpackedListProfile);


// To pack more complex data structure
const stateData = {
  users: [profile, profile, profile],
  posts:[
    {
      postId: 100,
      title: "Hello World!",
      score: 999,
      authors: [
        profile
      ]   
    }
  ]
}
const stateDataSchema = {
  users: listProfileSchema,
  posts: [
    {
      postId: UINT32,
      title: STRING,
      score: UINT16,
      authors: [
        profileSchema
      ]      
    }
  ]
}

const packedState = pack(stateData, stateDataSchema);
const unpackedState = unpack(packedState, stateDataSchema);

console.log(stateData, unpackedState);
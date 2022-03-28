# datapack

Datapack is a JS library that provide high performance methods `pack` and `unpack` binary data using schema of data model.
This library can be used in both NodeJS and Browser environtment.

## Installation

```
npm install datapack
```

## Usage
### Pack data

```
import {
  UINT16,
  UINT32,
  UINT64,
  UINT8,
  INT16,
  INT32,
  INT64,
  INT8,
  BINARY,
  BOOL,
  OBJECT,
  Schema,
  STRING,
  pack,
  unpack
} from "datapack";

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
```

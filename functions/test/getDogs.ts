/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as admin from "firebase-admin";
import firebaseFunctionsTest from "firebase-functions-test";
import {getDogs} from "../src/index";
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

const test = firebaseFunctionsTest({
  projectId: "tindog-4edd4",
});
const wrapped = test.wrap(getDogs);

describe("getDogs", () => {
  after(async () => {
    test.cleanup();
  });

  it("should throw an error if called without auth", async () => {
    return assert.isRejected(
      wrapped({} as any),
      Error,
      "The function must be called while authenticated."
    );
  });

  it("should throw an error if called without parameters", async () => {
    return assert.isRejected(
      wrapped({data: {}, auth: {uid: "user"}} as any),
      Error,
      "The function must be called with a valid dog Id."
    );
  });

  it("should throw an error if called without valid document Id", async () => {
    return assert.isRejected(
      wrapped({
        data: {dogId: "dog"},
        auth: {uid: "user"},
      } as any),
      Error,
      "The function must be called with valid dog Id."
    );
  }).timeout(10000);

  it("should throw an error if the dog doesn't belong to the authenticated user.", async () => {
    // create dogs in database that don't belong to "user"
    const dogsCollection = admin.firestore().collection("dogs");
    await dogsCollection.doc("dog").set({userId: "alice"});

    const result = await assert.isRejected(
      wrapped({
        data: {dogId: "dog"},
        auth: {uid: "user"},
      } as any),
      Error,
      "The dog does not belong to the authenticated user."
    );

    // cleanup test data
    await dogsCollection.doc("dog").delete();

    return result;
  }).timeout(10000);

  it("should get the unseen dogs", async () => {
    // create dogs in database
    const dogsCollection = admin.firestore().collection("dogs");
    const seenDogs = ["secondDog", "thirdDog", "fourthDog"];
    await Promise.all([
      dogsCollection
        .doc("firstDog")
        .set({name: "firstDog", userId: "alice", seen: seenDogs}),
      dogsCollection.doc("secondDog").set({name: "secondDog", userId: "bob"}),
      dogsCollection.doc("thirdDog").set({name: "thirdDog", userId: "bryan"}),
      dogsCollection.doc("fourthDog").set({name: "fourthDog", userId: "john"}),
    ]);

    const response = await wrapped({
      data: {dogId: "firstDog"},
      auth: {uid: "alice"},
    } as any);

    const allDogs = await dogsCollection.get();
    const unseenDogs = allDogs.docs.filter(
      (doc) => !seenDogs.includes(doc.id) && doc.id !== "firstDog"
    );
    const parsedDogs = unseenDogs.map((doc) => {
      return {...doc.data()};
    });

    const result = assert.deepEqual(response, parsedDogs);

    // cleanup test data
    await Promise.all([
      dogsCollection.doc("firstDog").delete(),
      dogsCollection.doc("secondDog").delete(),
      dogsCollection.doc("thirdDog").delete(),
      dogsCollection.doc("fourthDog").delete(),
    ]);

    return result;
  }).timeout(10000);
});

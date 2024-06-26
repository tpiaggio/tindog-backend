/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as admin from "firebase-admin";
import firebaseFunctionsTest from "firebase-functions-test";
import {matchDogs} from "../src/index";
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

const test = firebaseFunctionsTest({
  projectId: "tindog-4edd4",
});
const wrapped = test.wrap(matchDogs);

describe("matchDogs", () => {
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
      "The function must be called with two document IDs."
    );
  });

  it("should throw an error if called without valid document IDs", async () => {
    return assert.isRejected(
      wrapped({
        data: {firstDogId: "firstDog", secondDogId: "secondDog"},
        auth: {uid: "user"},
      } as any),
      Error,
      "The function must be called with valid document IDs, firstDogId: false, secondDogId: false"
    );
  }).timeout(10000);

  it("should throw an error if neither of the dogs belong to the authenticated user.", async () => {
    // create dogs in database that don't belong to "user"
    const dogsCollection = admin.firestore().collection("dogs");
    await Promise.all([
      dogsCollection.doc("firstDog").set({userId: "alice"}),
      dogsCollection.doc("secondDog").set({userId: "bob"}),
    ]);

    const result = await assert.isRejected(
      wrapped({
        data: {firstDogId: "firstDog", secondDogId: "secondDog"},
        auth: {uid: "user"},
      } as any),
      Error,
      "Neither of the dogs belong to the authenticated user."
    );

    // cleanup test data
    await Promise.all([
      dogsCollection.doc("firstDog").delete(),
      dogsCollection.doc("secondDog").delete(),
    ]);

    return result;
  }).timeout(10000);

  it("should throw an error if a chat between these two users already exists.", async () => {
    // create dogs in database
    const dogsCollection = admin.firestore().collection("dogs");
    await Promise.all([
      dogsCollection.doc("firstDog").set({userId: "alice"}),
      dogsCollection.doc("secondDog").set({userId: "bob"}),
    ]);
    // create chat in database
    const chatRef = await admin
      .firestore()
      .collection("chats")
      .add({
        userIds: ["alice", "bob"],
      });

    const result = await assert.isRejected(
      wrapped({
        data: {firstDogId: "firstDog", secondDogId: "secondDog"},
        auth: {uid: "alice"},
      } as any),
      Error,
      "A chat between these two users already exists."
    );

    // cleanup test data
    await Promise.all([
      chatRef.delete(),
      dogsCollection.doc("firstDog").delete(),
      dogsCollection.doc("secondDog").delete(),
    ]);

    return result;
  }).timeout(10000);

  it("should create a chat between the two users", async () => {
    // create dogs in database
    const dogsCollection = admin.firestore().collection("dogs");
    await Promise.all([
      dogsCollection.doc("firstDog").set({name: "firstDog", userId: "alice"}),
      dogsCollection.doc("secondDog").set({name: "secondDog", userId: "bob"}),
    ]);

    const response = await wrapped({
      data: {firstDogId: "firstDog", secondDogId: "secondDog"},
      auth: {uid: "alice"},
    } as any);

    const chat = await admin
      .firestore()
      .collection("chats")
      .doc(response.chatId)
      .get();

    const result = assert.deepEqual(response, {
      success: true,
      chatId: chat.id,
      text: chat.data()?.initialMessage?.text,
    });

    // cleanup test data
    await Promise.all([
      chat.ref.delete(),
      dogsCollection.doc("firstDog").delete(),
      dogsCollection.doc("secondDog").delete(),
    ]);

    return result;
  }).timeout(10000);
});

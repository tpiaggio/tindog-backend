import * as admin from "firebase-admin";
import firebaseFunctionsTest from "firebase-functions-test";
import {onMessageCreated} from "../src/index";
import "mocha";
import * as chai from "chai";

const assert = chai.assert;

const test = firebaseFunctionsTest({
  projectId: "tindog-4edd4",
});
const wrapped = test.wrap(onMessageCreated);

describe("onMessageCreated", () => {
  after(async () => {
    test.cleanup();
  });

  it("should update the lastMessage property of a chat when a message gets created", async () => {
    const chatRef = admin.firestore().doc("chats/chatId");
    await chatRef.set({
      userIds: ["alice", "bob"],
    });
    const message = {
      userId: "alice",
      text: "text",
    };

    const createSnap = test.firestore.makeDocumentSnapshot(
      message,
      "chats/chatId/messages/messageId"
    );

    await wrapped({data: createSnap, params: {chatId: "chatId"}});

    const chatDoc = await chatRef.get();
    const result = assert.deepEqual(
      {...message, read: false},
      chatDoc.data()?.lastMessage
    );

    await chatRef.delete();

    return result;
  }).timeout(10000);
});

import {readFileSync} from "fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import "mocha";

let testEnv: RulesTestEnvironment;
before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "tindog-4edd4",
    firestore: {
      host: "localhost",
      port: 8080,
      rules: readFileSync("../firestore.rules", "utf8"),
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe("Dogs", () => {
  it("should only allow the user to create its own dog", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    // Cannot create since userId is not the same as authenticated user
    await assertFails(
      addDoc(collection(aliceDb, "dogs"), {
        userId: "bob",
      })
    );

    // Can create since userId is the same as authenticated user
    await assertSucceeds(
      addDoc(collection(aliceDb, "dogs"), {
        userId: "alice",
      })
    );
  });

  it("should only allow the user to update its own dog, and the data should be valid", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    const dog = {
      name: "name",
      breed: "breed",
      size: "small",
      age: 1,
      description: "description",
    };

    // Setup: Create documents in DB for testing (bypassing Security Rules).
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "dogs/dogAlice"), {...dog, userId: "alice"});
      await setDoc(doc(db, "dogs/dogBob"), {...dog, userId: "bob"});
    });

    // Cannot update since dog's userId is not the same as authenticated user
    await assertFails(
      updateDoc(doc(aliceDb, "dogs/dogBob"), {
        ...dog,
      })
    );

    // Can update since dog's userId is the same as authenticated user
    await assertSucceeds(
      updateDoc(doc(aliceDb, "dogs/dogAlice"), {
        ...dog,
      })
    );

    // Cannot update since dog's data is not valid, name should not be empty
    // Same logic applies to breed, size, age, and description
    await assertFails(
      updateDoc(doc(aliceDb, "dogs/dogAlice"), {
        name: "",
      })
    );

    // Cannot update since userId shouldn't change
    await assertFails(
      updateDoc(doc(aliceDb, "dogs/dogAlice"), {
        userId: "bob",
      })
    );
  });
});

describe("Chats", () => {
  it("should only allow the user to read its own chat", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    // Setup: Create documents in DB for testing (bypassing Security Rules).
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "chats/aliceBob"), {
        userIds: ["alice", "bob"],
      });
      await setDoc(doc(db, "chats/bobDoe"), {
        userIds: ["bob", "doe"],
      });
    });

    // Cannot read since userId is not in chat's userIds
    await assertFails(getDoc(doc(aliceDb, "chats/bobDoe")));

    // Can read since userId is in chat's userIds
    await assertSucceeds(getDoc(doc(aliceDb, "chats/aliceBob")));
  });
});

describe("Messages", () => {
  it("should only allow the user to create and read its own messages", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    // Setup: Create documents in DB for testing (bypassing Security Rules).
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "chats/aliceBob"), {
        userIds: ["alice", "bob"],
      });
      await setDoc(doc(db, "chats/bobDoe"), {
        userIds: ["bob", "doe"],
      });
      await setDoc(doc(db, "chats/aliceBob/messages/alice"), {
        userId: "alice",
      });
      await setDoc(doc(db, "chats/bobDoe/messages/bob"), {
        userId: "bob",
      });
    });

    // Cannot read since userId is not in chat's userIds
    await assertFails(getDoc(doc(aliceDb, "chats/bobDoe/messages/bob")));

    // Can read since userId is in chat's userIds
    await assertSucceeds(getDoc(doc(aliceDb, "chats/aliceBob/messages/alice")));

    // Cannot create since userId is not the same as authenticated user
    await assertFails(
      addDoc(collection(aliceDb, "chats/aliceBob/messages"), {
        userId: "bob",
      })
    );

    // Cannot create since userId is not is not in chat's userIds
    await assertFails(
      addDoc(collection(aliceDb, "chats/bobDoe/messages"), {
        userId: "alice",
      })
    );

    // Can create since userId is the same as authenticated user
    await assertSucceeds(
      addDoc(collection(aliceDb, "chats/aliceBob/messages"), {
        userId: "alice",
      })
    );
  });
});

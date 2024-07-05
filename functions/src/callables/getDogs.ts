import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";

const getDogs = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const {dogId}: {dogId?: string} = request.data;
  // Check if the request has the required arguments
  if (!dogId) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a valid dog Id."
    );
  }
  const db = getFirestore();
  const dog = await db.collection("dogs").doc(dogId).get();
  // Check if dogs exist
  if (!dog.exists) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with valid dog Id."
    );
  }
  // Check if one of the dogs belong to the authenticated user
  if (dog.data()?.userId !== request.auth?.uid) {
    throw new HttpsError(
      "permission-denied",
      "The dog does not belong to the authenticated user."
    );
  }
  const seenDogs = dog.data()?.seen;
  const allDogs = await db.collection("dogs").get();
  const unseenDogs = allDogs.docs.filter(
    (doc) => !seenDogs.includes(doc.id) && doc.id !== dogId
  );
  const parsedDogs = unseenDogs.map((doc) => {
    return {...doc.data()};
  });
  return parsedDogs;
});

export default getDogs;

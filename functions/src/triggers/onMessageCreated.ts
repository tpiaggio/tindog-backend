import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {getFirestore} from "firebase-admin/firestore";

type Message = {
  userId: string;
  text: string;
  timestamp: Date;
};

export default onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }
    const createdValue = snapshot.data() as Message;
    const {chatId} = event.params;

    // TODO: Implement sending notification

    return getFirestore()
      .collection("chats")
      .doc(chatId)
      .update({
        lastMessage: {
          ...createdValue,
          read: false,
        },
      });
  }
);

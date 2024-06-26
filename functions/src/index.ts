import {configureGenkit} from "@genkit-ai/core";
import {googleAI} from "@genkit-ai/googleai";
import {firebase} from "@genkit-ai/firebase";
import {defineSecret, defineString} from "firebase-functions/params";
import {initializeApp, getApps} from "firebase-admin/app";
import dogDataFlow from "./flows/dogDataFlow";
import matchDogs from "./callables/matchDogs";
import onMessageCreated from "./triggers/onMessageCreated";

defineSecret("GOOGLE_GENAI_API_KEY");
defineString("STORAGE_BUCKET");

if (getApps().length === 0) {
  initializeApp({
    storageBucket: process.env.STORAGE_BUCKET,
  });
}

configureGenkit({
  plugins: [firebase(), googleAI({apiVersion: "v1beta"})],
  logLevel: "debug",
  enableTracingAndMetrics: true,
});

export {dogDataFlow, matchDogs, onMessageCreated};

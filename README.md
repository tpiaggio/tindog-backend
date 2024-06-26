# Tindog Backend

[![License: MIT][license_badge]][license_link]

Backend project for Tindog, built with [Firebase][firebase_link] using [Genkit][genkit_link] for [Fluttercon Europe][fluttercon_link].

You can also check out the frontend built with Flutter in its dedicated [GitHub repository][tindog_frontend_repo].

---

## Getting Started 🚀

To run this, first we need to install Genkit.

```sh
npm i -g genkit
```

Review the [documentation][genkit_link] for details and samples.

One important step is to set the `GOOGLE_GENAI_API_KEY` environment variable to your key:

```sh
export GOOGLE_GENAI_API_KEY=<your API key>
```

After installin Genkit, we deploy our backend to Firebase using the following command:

```sh
firebase deploy
```

This will make our flows and functions available to our [Tindog Frontend][tindog_frontend_repo].

## Start the Genkit Developer UI 💻

To start the Genkit Developer UI use the following command:

```sh
genkit start
```

Review the [documentation][genkit_firebase_link] for details and samples.

If you want to run this using the [Firebase Local Emulator Suite][firebase_emulator_link], you should first run the emulators with the following command:

```sh
GENKIT_ENV=dev firebase emulators:start --inspect-functions
```

And then start Genkit in another port (since both Genkit and Emulators use the same default 4000 port) using the following command:

```sh
genkit start --attach http://localhost:3100 --port 4001
```

---

## Running Tests 🧪

To run all Cloud Functions and Security Rules tests, use the following command:

```sh
npm run test
```

If you want to run the Cloud Functions test only, use the following command:

```sh
npm run test-cloud-functions
```

If you want to run the Security Rules test only, use the following command:

```sh
npm run test-rules-emulators
```

---

[firebase_link]: https://firebase.google.com/
[firebase_emulator_link]: https://firebase.google.com/docs/genkit/firebase#developing_using_firebase_local_emulator_suite
[genkit_link]: https://firebase.google.com/docs/genkit
[genkit_firebase_link]: https://firebase.google.com/docs/genkit/firebase
[fluttercon_link]: https://fluttercon.dev/
[license_badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license_link]: https://opensource.org/licenses/MIT
[tindog_frontend_repo]: https://github.com/3ettilina/tindog

const Sentry = require("@sentry/node");
// or use es6 import statements
// import * as Sentry from '@sentry/node';

const Tracing = require("@sentry/tracing");
// or use es6 import statements
// import * as Tracing from '@sentry/tracing';

Sentry.init({
    dsn: "https://547b84ae185c40a3aaaf380d4fc8f894@o1272658.ingest.sentry.io/6466536",

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
});

const transaction = Sentry.startTransaction({
    op: "test",
    name: "My First Test Transaction",
});

setTimeout(() => {
    try {
        foo();
    } catch (e) {
        Sentry.captureException(e);
    } finally {
        transaction.finish();
    }
}, 99);
# Buffer integration

The implementation follows Buffer's current official GraphQL API at `https://api.buffer.com`: Bearer authentication and `createPost` using `schedulingType: automatic`, `mode: customScheduled`, `channelId` and UTC `dueAt`. Approval is checked before the provider call. `scheduled_posts.idempotency_key` is unique and failures/retries are auditable.

Without `BUFFER_API_KEY`, `DemoSocialPublisher` completes the workflow and returns `simulated: true`. It never implies a live post was sent. Current Buffer analytics are not invented; campaign outcomes are recorded by the application. No Buffer credentials were available, so the live GraphQL path is code-reviewed only and must receive a credentialed smoke test before it is described as working.

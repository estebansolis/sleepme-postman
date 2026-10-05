# Collection execution contract

The expanded JSON collection and the v3 YAML collection share these expectations.
The original downloaded collection and OpenAPI reference remain source snapshots.

## Device controls

- Reads run normally. Every write is skipped before transmission by default.
- To run one PATCH recipe, set `allowed_control_request` to its exact request name
  (for example, `Turn Device On`) and supply a nonblank token and device ID.
- A boolean-like value such as `true`, a different request name, or missing
  configuration does not enable a control. Clear the setting after use.
- A full run with one recipe enabled still skips all other control recipes.
- Skips are reported in the console; they are not failed assertions. Use the
  selected request's response and assertions to confirm that a control ran.

## Read-only smoke test

`npm run smoke -- --mock` runs List Devices, Get Device Status, List Sleep Reports,
and Get Today Sleep Reports against the local Postman mock. The same command with
`--environment <private-file>` instead of `--mock` targets the configured API.
Use `--format yaml` to exercise the v3 collection (JSON is the default).

The wrapper only selects these four GET requests, clears the control opt-in,
rejects missing credentials/device ID for a live run, and paces live requests
6.5 seconds apart. The account-wide limit still includes other clients. There
are no automatic retries. The smoke test never chooses a device for you.

## Response assertions

Every sent request must return HTTP 200, JSON content type, and valid JSON.
Basic success checks then verify:

- Device list: an array; each device has a nonempty string ID. An empty list is
  accepted as a valid account state, despite the source reference's `minItems: 1`.
- Device status: `about` and `status` objects; `control` is optional for different
  device models. Known fields are type-checked when present, with extra fields
  permitted. This is a smoke-test expectation, not strict OpenAPI validation.
- Reports: a `reports` array, dates and session arrays; known duration fields
  are nonnegative integers or null when present. Empty reports are valid.
- PATCH: a JSON object, including `{}`, matching the documented update response.

Mock data is synthetic and follows the checked-in reference. Mock tests establish
collection/guard behavior, not compatibility with a live Sleepme device. No live
controls run in CI. Bad HTTP status, malformed JSON, and wrong response shapes
must make the Postman CLI exit unsuccessfully.

## Local checks and CI

Install Node.js 22 or newer and Postman CLI 1.69.0 (the CI-pinned version), then run:

```sh
npm run lint:collection
npm test
npm run smoke -- --mock
npm run smoke -- --mock --format yaml
```

No npm dependencies or Postman login are required for the tests. The test suite
uses Postman's local mock routing and records received methods/paths/payloads to
temporary files to verify that blocked controls never reach the server. It tests
both collection formats. Keep their scripts and defaults in sync when editing.

GitHub Actions runs collection lint and the mock test suite on pull requests and
pushes to `main`. All CLI runs disable reporting to Postman; no Sleepme or Postman
secrets are needed.

# Sleepme Postman collection

A Postman collection for the Sleepme Public Developer API, with 14 saved requests covering all four documented operations and individual device-control recipes.

## Contents

- `postman/files/sleepme-public-developer-api.postman_collection.json`: expanded Postman v2.1 collection, ready to import into the desktop app.
- `postman/collections/sleepme-public-developer-api/`: the same collection in the CLI's v3 YAML format.
- `postman/files/sleepme-public-developer-api.original.postman_collection.json`: original public example collection.
- `postman/files/sleepme-device-control.reference.yaml`: downloaded Sleepme OpenAPI v1.1 reference, retrieved October 5, 2026.
- `postman/files/sleepme-cli-commands.txt`: an individual CLI command for every saved request.

## Get started in Postman

1. Click **Import** and select the expanded `.postman_collection.json` file.
2. Create a private local environment with `SleepMeAPI_Token` set to your Sleepme developer bearer token. This is a Sleepme token, separate from a Postman API key.
3. Select that environment and run **Devices / List Devices**.
4. Copy the desired device ID into the environment variable `device_id`.
5. Run **Devices / Get Device Status**, then choose the specific control or report request you need. Controls are skipped until you set `allowed_control_request` to the exact request name; clear it after use.

Requests inherit bearer authentication from the collection. The base URL is `https://api.developer.sleep.me/v1`.

## Available requests

| Folder | Requests |
| --- | --- |
| Devices | List Devices; Get Device Status; Update Device Status |
| Devices | Turn Device On; Turn Device Off |
| Devices | Set Temperature Fahrenheit; Set Temperature Celsius; Set Maximum Cooling; Set Maximum Heating |
| Devices | Display Fahrenheit; Display Celsius; Set Device Time Zone |
| Sleep Reports | List Sleep Reports; Get Today Sleep Reports |

The extra requests are recipes using the documented PATCH operation, rather than additional API endpoints. Temperature and power controls apply to Dock Pro devices. The status request also reads model-specific Sleep Tracker data. Sleep reports include sessions, durations, sleep scores, and hypnograms.

## Variables

| Variable | Purpose / default |
| --- | --- |
| `SleepMeAPI_Url` | API base URL, without a trailing slash |
| `SleepMeAPI_Token` | Your developer token; blank in the expanded collection |
| `device_id` | Claimed device ID; blank until you select a device |
| `allowed_control_request` | Exact name of one control recipe to enable; blank skips all writes |
| `start_date` | Optional `YYYY-MM-DD` date; query parameter disabled by default so the API uses the current date |
| `days_back` | `0`–`6`; defaults to `6` for the range request |
| `time_zone` | IANA time zone; defaults to `UTC` |

To query a specific date, set `start_date` and enable its query parameter in the request. The today request uses `days_back=0`. The same `time_zone` variable supplies report queries and the device time-zone recipe.

Edit the temperature request body to choose a value: Fahrenheit accepts integers from 55 through 115; Celsius accepts half-degree increments from 13 through 48. The documented maximum cooling/heating values are `-1` and `999`. Setting a temperature alone does not include a power change in the request body. The general Update Device Status recipe sets 69 F and standby; edit it to send any supported combination of controls.

## Postman CLI

Run commands from the repository root. Export your private environment to a local file such as `sleepme.private.postman_environment.json`, which is excluded by `.gitignore`.

```sh
postman collection run postman/files/sleepme-public-developer-api.postman_collection.json \
  -i "List Devices" \
  -e sleepme.private.postman_environment.json \
  --no-report-events
```

The v3 collection can also be run by passing `postman/collections/sleepme-public-developer-api` as the collection path. Every individual JSON request command is listed in `postman/files/sleepme-cli-commands.txt`.

PATCH requests are skipped by default. Enable only the recipe you intend to run by setting `allowed_control_request` to its exact name. For example:

```sh
postman collection run postman/files/sleepme-public-developer-api.postman_collection.json \
  -i "Turn Device On" \
  -e sleepme.private.postman_environment.json \
  --env-var "allowed_control_request=Turn Device On" \
  --no-report-events
```

A valid token and device ID are also required. In the app, set the opt-in in your private environment and clear it after use. A full collection run skips all other controls even when one recipe is enabled. Skips are logged; confirm the selected control has a response and passing assertions. The CLI examples use unique request names because CLI 1.69.0 rejects folder/request selectors for JSON collections.

Sleepme documents a limit of 10 requests per account per discrete minute. Handle HTTP 429 with exponential backoff; automatic retry logic is not included.

Validate the local CLI collection without sending requests:

```sh
postman collection lint postman/collections/sleepme-public-developer-api
```

## Read-only smoke tests and CI

Install Node.js 22+ and Postman CLI 1.69.0, then run the four GET requests against
synthetic local fixtures:

```sh
npm run smoke -- --mock
npm run smoke -- --mock --format yaml
```

To check your own account, export a private JSON environment with a token and a
device ID you selected, then run:

```sh
npm run smoke -- --environment sleepme.private.postman_environment.json
```

This command clears the control opt-in, selects only reads, and spaces live calls
6.5 seconds apart. Other clients share the same account rate limit.

Run `npm run lint:collection` and `npm test` for the same checks used in CI.
See [the test contract](docs/testing.md) for assertions, fixture coverage, and limits.

## Reference and validation

- [Sleepme API reference](https://docs.developer.sleep.me/api/)
- [Sleepme API examples](https://docs.developer.sleep.me/docs/apiexamples/)
- [Underlying OpenAPI reference](https://docs.developer.sleep.me/api/device-control.yaml)

All four documented method/path operations are represented: `GET /devices`, `GET /devices/{device_id}`, `PATCH /devices/{device_id}`, and `GET /sleep-reports/`. All five writable control properties and all three report query parameters are covered. The source reference contains inconsistent interval wording for sleep reports; refer to the source and verify returned dates for your use case.

Both collection formats include a control guard and response assertions. GitHub Actions lints the v3 collection and tests both formats against a local Postman mock, including blocked controls and invalid responses. These checks do not require account tokens or a Postman login. The collection has not been tested against a live device. Saved response examples and automatic device-ID selection are not included.

This repository includes third-party Sleepme reference material and is an independent collection, not an official Sleepme SDK. Source references retain their original attribution; no license for third-party material is asserted here.

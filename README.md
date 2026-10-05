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
5. Run **Devices / Get Device Status**, then choose the specific control or report request you need.

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
| `start_date` | Optional `YYYY-MM-DD` date; query parameter disabled by default so the API uses the current date |
| `days_back` | `0`–`6`; defaults to `6` for the range request |
| `time_zone` | IANA time zone; defaults to `UTC` |

To query a specific date, set `start_date` and enable its query parameter in the request. The today request uses `days_back=0`. The same `time_zone` variable supplies report queries and the device time-zone recipe.

Edit the temperature request body to choose a value: Fahrenheit accepts integers from 55 through 115; Celsius accepts half-degree increments from 13 through 48. The documented maximum cooling/heating values are `-1` and `999`. Setting a temperature alone does not include a power change in the request body. The general Update Device Status recipe sets 69 F and standby; edit it to send any supported combination of controls.

## Postman CLI

Run commands from the repository root. Export your private environment to a local file such as `sleepme.private.postman_environment.json`, which is excluded by `.gitignore`.

```sh
postman collection run postman/files/sleepme-public-developer-api.postman_collection.json \
  -i "Devices/List Devices" \
  -e sleepme.private.postman_environment.json \
  --no-report-events
```

The v3 collection can also be run by passing `postman/collections/sleepme-public-developer-api` as the collection path. Every individual JSON request command is listed in `postman/files/sleepme-cli-commands.txt`.

PATCH requests change the selected device. Choose an individual request with `-i`; a full collection run includes every control recipe. Sleepme documents a limit of 10 requests per account per discrete minute. Handle HTTP 429 with exponential backoff; automatic retry logic is not included.

Validate the local CLI collection without sending requests:

```sh
postman collection lint postman/collections/sleepme-public-developer-api
```

## Reference and validation

- [Sleepme API reference](https://docs.developer.sleep.me/api/)
- [Sleepme API examples](https://docs.developer.sleep.me/docs/apiexamples/)
- [Underlying OpenAPI reference](https://docs.developer.sleep.me/api/device-control.yaml)

All four documented method/path operations are represented: `GET /devices`, `GET /devices/{device_id}`, `PATCH /devices/{device_id}`, and `GET /sleep-reports/`. All five writable control properties and all three report query parameters are covered. The source reference contains inconsistent interval wording for sleep reports; refer to the source and verify returned dates for your use case.

The expanded collection passed CLI linting with 14 requests, zero errors, and zero warnings. It has not been tested against a live device. Saved response examples, automatic device-ID selection, and automated response assertions are not included.

This repository includes third-party Sleepme reference material and is an independent collection, not an official Sleepme SDK. Source references retain their original attribution; no license for third-party material is asserted here.

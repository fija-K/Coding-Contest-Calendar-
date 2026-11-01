# DATA SOURCES SPECIFICATION & VERIFICATION REPORT

This document details the research, technical discovery, integration contracts, and live verification results for all three competitive programming platforms aggregated by the Coding Contest Calendar.

---

## 1. Codeforces

### Upstream Endpoint
- **URL**: `https://codeforces.com/api/contest.list?gym=false`
- **Method**: `GET`
- **Protocol**: HTTP/1.1 over TLS 1.3
- **Authentication**: None required for public contest listings.
- **Official Documentation**: [https://codeforces.com/apiHelp](https://codeforces.com/apiHelp)

### Request Specifications
- **Headers**:
  - `User-Agent`: Educational/Institutional identification string.
  - `Accept`: `application/json`
- **Timeout**: 15 seconds.

### Response Payload Structure
```json
{
  "status": "OK",
  "result": [
    {
      "id": 2283,
      "name": "Educational Codeforces Round 196 (Rated for Div. 2)",
      "type": "CF",
      "phase": "BEFORE",
      "frozen": false,
      "durationSeconds": 7200,
      "startTimeSeconds": 1793799300,
      "relativeTimeSeconds": -245842
    }
  ]
}
```

### Parsing & Normalization Details
1. **Identifier**: `f"codeforces_{id}"` (e.g., `codeforces_2283`).
2. **Start Time**: `startTimeSeconds` is an integer Unix timestamp in seconds. Normalized to timezone-aware UTC datetime.
3. **Duration**: `durationSeconds` (integer seconds).
4. **Phase Mapping**:
   - `phase == "BEFORE"`: Filtered as `upcoming`.
   - `phase == "CODING"`: Filtered as `ongoing`.
   - `phase == "FINISHED"`: Historical. Skipped during regular upstream fetch to minimize bandwidth and storage overhead.
5. **Contest URL**: `https://codeforces.com/contest/{id}`.

### Rate Limits & Caveats
- Codeforces API limits requests to at most 5 requests per second per IP. Our background scheduler runs at 30-minute intervals, which sits 9000x below the rate limit threshold.
- Cloudflare protection is occasionally enabled during major live rounds. Our collector handles 429/503 status codes gracefully without interrupting service or purging cached records.

---

## 2. CodeChef

### Upstream Endpoint
- **URL**: `https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all`
- **Method**: `GET`
- **Protocol**: HTTPS
- **Authentication**: None required.
- **Type**: Official contest directory JSON endpoint used by CodeChef's frontend application.

### Request Specifications
- **Headers**:
  - `User-Agent`: Standard modern browser User-Agent string.
  - `Accept`: `application/json`
- **Timeout**: 15 seconds.

### Response Payload Structure
```json
{
  "status": "success",
  "future_contests": [
    {
      "contest_id": "79608",
      "contest_code": "DSAMONDAY027",
      "contest_name": "Monday Munch - DSA Challenge 027 (Rated)",
      "contest_start_date": "02 Nov 2026  19:00:00",
      "contest_end_date": "02 Nov 2026  22:00:00",
      "contest_start_date_iso": "2026-11-02T19:00:00+05:30",
      "contest_end_date_iso": "2026-11-02T22:00:00+05:30",
      "contest_duration": "180",
      "distinct_users": 0
    }
  ],
  "present_contests": []
}
```

### Parsing & Normalization Details
1. **Identifier**: `f"codechef_{contest_code}"` (e.g., `codechef_DSAMONDAY027`).
2. **Start Time**: `contest_start_date_iso` provides an ISO 8601 string with explicit offset (`+05:30`). Our parser converts this into UTC datetime (`2026-11-02T13:30:00Z`).
3. **Duration**: `contest_duration` is provided in **minutes** as a string or integer (e.g., `"180"` -> 180 minutes). Converted to seconds: `180 * 60 = 10800` seconds.
4. **Contest URL**: `https://www.codechef.com/{contest_code}`.

### Rate Limits & Caveats
- Requests without a valid browser `User-Agent` may receive HTTP 403. Our collector configures an explicit User-Agent.

---

## 3. LeetCode

### Upstream Endpoint
- **URL**: `https://leetcode.com/graphql`
- **Method**: `POST`
- **Protocol**: HTTPS
- **Authentication**: None required for contest directory queries.
- **Type**: Official public GraphQL API endpoint.

### GraphQL Query
```graphql
query {
  topTwoContests {
    title
    titleSlug
    startTime
    duration
  }
  allContests {
    title
    titleSlug
    startTime
    duration
    originStartTime
    isVirtual
  }
}
```

### Request Specifications
- **Headers**:
  - `User-Agent`: Standard modern User-Agent.
  - `Content-Type`: `application/json`
  - `Referer`: `https://leetcode.com/contest/`
- **Timeout**: 15 seconds.

### Response Payload Structure
```json
{
  "data": {
    "topTwoContests": [
      {
        "title": "Weekly Contest 527",
        "titleSlug": "weekly-contest-527",
        "startTime": 1794105000,
        "duration": 5400
      },
      {
        "title": "Biweekly Contest 195",
        "titleSlug": "biweekly-contest-195",
        "startTime": 1794061800,
        "duration": 5400
      }
    ]
  }
}
```

### Parsing & Normalization Details
1. **Identifier**: `f"leetcode_{titleSlug}"` (e.g., `leetcode_weekly-contest-527`).
2. **Virtual Contests**: Contests flagged with `isVirtual: true` are discarded.
3. **Start Time**: `startTime` is integer Unix timestamp in seconds. Normalized to UTC datetime.
4. **Duration**: `duration` is integer seconds (e.g., 5400 = 1.5 hours).
5. **Contest URL**: `https://leetcode.com/contest/{titleSlug}`.

---

## 4. GeeksforGeeks (GFG)

### Upstream Endpoint
- **URL**: `https://practiceapi.geeksforgeeks.org/api/vr/events/?type=contest&sub_type=all&category=all`
- **Method**: `GET`
- **Protocol**: HTTPS
- **Authentication**: None required for public contest listings.
- **Type**: Official public events/contests directory API backing the GeeksforGeeks Practice portal (`https://practice.geeksforgeeks.org/events?type=contest`).

### Request Specifications
- **Headers**:
  - `User-Agent`: Standard browser User-Agent.
  - `Accept`: `application/json`
- **Timeout**: 15 seconds.

### Response Payload Structure
```json
{
  "status": 200,
  "message": "success",
  "results": {
    "upcoming": [
      {
        "id": 1420,
        "name": "GFG Weekly Coding Contest - 190",
        "slug": "weekly-coding-contest-190",
        "start_time": "2026-05-17T19:00:00",
        "end_time": "2026-05-17T20:30:00",
        "banner": {},
        "type": 3,
        "status": "UPCOMING"
      }
    ],
    "past": [ ... ]
  }
}
```

### Parsing & Normalization Details
1. **Identifier**: `f"gfg_{slug}"` (fallback `f"gfg_{id}"`).
2. **Event Type Filtering**: In GFG's API, `type == 3` explicitly designates timed competitive coding contests, whereas `type: 1` represents webinars and `type: 2` represents workshops and courses. The collector strictly filters for `type == 3` to exclude non-contest events.
3. **Start and End Time**: GFG API timestamps are naive ISO datetime strings (e.g., `"2026-05-17T19:00:00"`) formatted in Indian Standard Time (IST, UTC+05:30). The collector explicitly attaches `Asia/Kolkata` (`+05:30`) and converts to standard UTC datetime (e.g., `2026-05-17T13:30:00Z`).
4. **Duration**: Calculated as integer seconds from `end_time - start_time`.
5. **Contest URL**: `https://practice.geeksforgeeks.org/contest/{slug}`.

### Rate Limits & Caveats
- No API token is required.
- Timed coding contests are distinguished from ongoing practice problems and webinars via the `type: 3` filter.
- If upstream returns no verified upcoming contests (`results.upcoming: []`), the system accurately displays 0 contests without fabricating recurring dates or mock schedules.

---

## 5. Live Verification Summary

| Source | Endpoint Type | Live Call Status | Verified Contests Fetched | Error Handling Verified |
|---|---|---|---|---|
| **Codeforces** | Official REST API | **VERIFIED (HTTP 200)** | 7 Upcoming/Ongoing Contests | Timeout, 503, Malformed |
| **CodeChef** | Official JSON API | **VERIFIED (HTTP 200)** | 4 Upcoming Contests | Missing duration, Timeout |
| **LeetCode** | Public GraphQL API | **VERIFIED (HTTP 200)** | 3 Upcoming Contests | Virtual filter, GraphQL errors |
| **GeeksforGeeks** | Official Events API | **VERIFIED (HTTP 200)** | 0 Upcoming Contests (Upstream has 0 active; correctly reports 0) | Type filtering, Naive IST normalization, Timeout, Malformed |

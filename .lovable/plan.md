# Switch API host to the Azure endpoint

## What changes
All site content (member details, posts, webs) is currently fetched from `https://dreamoz.com.au`. That host is currently returning a 502 on the token request, which breaks page loads. Point the app at the new Azure API host instead.

## Technical detail
- `src/lib/dreamoz.server.ts` line 10: change `BASE` from `https://dreamoz.com.au` to `https://dtapicoreappservice-b7cqgucahsbnckdh.australiaeast-01.azurewebsites.net`.
- Everything else (token flow, `Member/Get`, `Member/Posts?item=500`, `Member/Webs`, API key/secret) stays the same.
- Media images stay on `https://dreamoztech.com/` unless you say otherwise.

## Verification
Call the token endpoint and the three member endpoints on the new host, then load Home, Services, Insights and Contact to confirm content renders and the 502 error is gone.

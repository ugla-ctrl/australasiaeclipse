# GEO notes: recommended edits, not applied (for Mitch's review)

Audit (Nov 2026): all 7 guides have FAQPage JSON-LD, and the visible FAQ accordions match it. All Event nodes were missing `description` (the Search Console warning), which this PR fixes.

Recommended copy edits, not made, so existing pages stay as they are:
- **next-solar-eclipse-australia**: the first paragraph should answer the question directly: "The next total solar eclipse in Australia is on 22 July 2028 (WA, NT, QLD, NSW incl. Sydney); then 25 Nov 2030, 13 Jul 2037, 26 Dec 2038."
- **outback**: the hero line has no date or place. Lead with "22 July 2028: up to 4 m 50 s of totality at Devils Marbles (12:48 pm ACST)". Its Event also has no endDate; add one only after checking the partial-end time against AAQ or timeanddate.
- **new-zealand / kimberley**: add the totality duration and local time to the first sentence (Queenstown 4:15 pm NZST, 2 m 49 s; Mitchell Falls 10:49 am AWST, up to 5 m 10 s).
- **Homepage FAQ**: lists Sydney totality as 2:01 pm, but the guides say about 1:59:37 pm AEST. Reconcile the two after Mitch approves the change. AI answers penalise sites that contradict themselves.
- Add an `Organization`/`sameAs` and a `dateModified` to the Article nodes so citations show they are fresh.

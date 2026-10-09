# Officer hunt, payment release, deadline extensions and email triage

How the next board, directors and executive assistants (EAs) get into the app, how one "Open payments" action invites both R101 members and officers, and what happens to emails that may or may not have been delivered.

The Officer Hunt is its own round, separate from R101. It reuses applying, interviews, decisions, redirects and results, but its applications, seats and interview slots are tagged `officer_hunt`, so the two rounds never show up in each other's lists.

## 1. Officer hunt: from applying to holding a seat

```mermaid
flowchart TB
    S1["HR · Officer Hunt Setup<br/>term year (e.g. 2027), application dates,<br/>interview dates, which seats are open"] --> S2["HR opens interview slots<br/>per office or committee"]
    S2 --> A1["Applicant opens /officer-hunt<br/>UST email, 1st and 2nd seat choice,<br/>resume, motivation, picks a slot"]
    A1 --> A2["Gets Application ID AP-2027-NNNNNN<br/>(its own application, separate from R101)"]
    A2 --> I1[Interview]
    I1 --> R1["HR · Hunt Applications<br/>approve one choice, reject, or offer another seat"]
    R1 --> R2{"HR releases hunt results<br/>(blocked if a one-person seat has two winners<br/>or the seat is already filled)"}
    R2 -- accepted --> W1["Officer seat created (board, director or EA)<br/>Member ID number reserved<br/>(EAs are numbered from their office's block at payment)"]
    W1 --> W2["Welcome email: your seat, reserved Member ID,<br/>Application ID, how to sign in"]
    R2 -- rejected --> X1["Hunt rejection email<br/>(can still apply to R101)"]
    R2 -- offered another seat --> X2["Seat offer email: accept or decline<br/>on the dashboard"]
    X2 -- accepts --> W1
    X2 -- declines --> X3[Not seated]
    W2 --> P["Payment period opens (diagram 2)"]
```

Things to know:

- The term year is the year the winners serve. Their Application IDs and Member IDs follow it (`AP-2027-…`, `AWS-2728-…`).
- A board or director seat has one holder. Two accepted applicants for the same seat, or a seat that is already filled for the term, block the release with a reason on each application.
- An EA seat takes people in numbers. Set how many places it has when you open it. The Member ID block for an office is sized by the office's R101 EA places, so keep the total there and treat hunt EAs as filling it.
- Accepting a seat offer seats the person immediately, and sends them their welcome (and payment invitation if payments are open).

## 2. Open payments: one action, two emails

```mermaid
flowchart TB
    HR["HR · Payment Setup<br/>Open and send invitations"] --> E{Who is eligible this year?}
    E -- "R101: member-only approved,<br/>position applicants with released results" --> M["Payment row + R101 payment email<br/>(amount, deadline, Application ID)"]
    E -- "Elected officers: board, directors, EAs<br/>(seeded or from the hunt)" --> O["Payment row + OFFICER payment email<br/>title, reserved Member ID AWS-2728-0001,<br/>Application ID, sign-in steps, amount, deadline"]
    E -- Advisers --> N[No payment, card already active]
    L["Officer seated AFTER payments opened"] --> O
    M --> PAY[Sign in, pay, upload receipt]
    O --> PAY
    PAY --> V{HR verifies the receipt}
    V --> ID["Member ID issued + 'You are verified' email<br/>group links on the dashboard"]
```

A hunt winner only joins this year's campaign when their term year is this year's recruitment year. Winners for a later term wait for that term's payments to open.

## 3. Extending the payment deadline

```mermaid
flowchart TB
    D1["HR · Payment Setup<br/>moves the deadline later and saves"] --> D2{"Payments open AND<br/>new deadline later than the old one and in the future?"}
    D2 -- no --> D3[Save only, no emails]
    D2 -- yes --> D4["Payments that expired on the old date reopen<br/>(awaiting payment, or needs resubmission<br/>if a receipt was rejected)"]
    D4 --> D5["Resubmission deadlines earlier than<br/>the new deadline move up to it"]
    D5 --> D6{Payment status}
    D6 -- "Awaiting payment, needs resubmission, expired" --> D7["'Payment deadline extended' email<br/>new deadline, amount, Application ID"]
    D6 -- "Verified, or receipt under review" --> D8[No email]
    D7 --> D9["HR sees: Payment period saved · N people emailed"]
```

Saving again, or saving the same later date twice, never emails the same person twice while their first email is still queued.

## 4. Uncertain result emails

```mermaid
flowchart TB
    U1["Result Emails · Uncertain list<br/>a checkbox per address, plus Select all"] --> U2[HR checks the sender's Sent folder]
    U2 --> U3{Found in Sent?}
    U3 -- yes --> U4["Tick, then Mark as delivered<br/>the row becomes Sent and leaves the list"]
    U3 -- no --> U5["Tick, then Resend selected<br/>only those rows are queued again"]
    U5 --> U6[Worker sends: Sent, Failed or Uncertain again]
```

The panel works the same for the officer hunt's results, scoped to the hunt.

## Where things live

| What | Where |
|---|---|
| Hunt term, dates, seats, interview slots | HR → Officer Hunt Setup |
| Hunt applications and decisions | HR → Hunt Applications |
| Release hunt results | HR → Hunt Results |
| Public apply page | `/officer-hunt` |
| Payment release and deadline | HR → Payment Setup |
| Uncertain emails | The Result Emails panel on each Results page |

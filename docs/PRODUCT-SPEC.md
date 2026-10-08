# Broken Bodies Player App — Product Specification

Status: agreed product direction, captured in the public `gkedev/mackay` repository for Cloudroom development. Application implementation, external app account configuration, and deployment are pending. This document is not evidence of implemented application features.

## Purpose and tone

A fun, friendly player app for older adults who regularly play sports, starting with the Broken Bodies Monday-night tennis group. Being a Broken Body is a badge of courage: players can celebrate playing through everyday aches and ailments. The app should feel like a clubhouse, not a medical portal.

Scheduling is nevertheless serious and routine: distinguish possible participation from confirmed commitments, avoid overbooking, manage substitutes, and communicate final arrangements clearly. Humor belongs in badges and optional copy, not in ambiguous scheduling controls.

## Existing routine

- Players currently communicate through WhatsApp.
- The organizer posts an invitation Friday at noon Pacific for the following Monday night.
- The group usually needs four to eight players.
- The invitation states how many players are needed and which playing times are available.
- Scheduling and injury notes are currently maintained manually.
- Recurring timing must use `America/Los_Angeles`, not a fixed UTC offset.

## Availability and ailments are separate

### Weekly availability

Each player can answer for a particular Monday event:

- **I'm in:** select acceptable time slots.
- **Maybe:** select possible time slots, but do not count as confirmed.
- **Not this week:** no time slots required.

An unavailable player does not need to select an injury or explain themselves. An optional reason may be away, work/family, other plans, taking a week off, an ailment, or other. Reasons are not required and are not medical diagnoses.

A player with no ailment badges can be unavailable. A player with several muted badges can be available. A profile's badge count must never determine availability.

### Broken Bodies badges

Small illustrated icons represent areas such as knee, ankle, shoulder, elbow, wrist, and back. Allow multiple badges.

Each selected badge has a player-declared play impact:

| Presentation | Meaning | Scheduling effect |
| --- | --- | --- |
| Muted/gray, deliberately resembling a disabled control | **A factor — playing through it** | Does not block signup or confirmation |
| Full color, with a clear blocker label/marker | **A blocker — sitting this one out** | Blocks confirmation while explicitly active for the relevant event |

The muted appearance is an intentional, humorous visual language. It does **not** mean the badge is functionally disabled: every badge remains tappable, editable, keyboard accessible, and available to assistive technology. Do not set HTML `disabled` or `aria-disabled` solely because a badge is muted.

Use text/tooltips and accessible labels alongside color, for example "Knee: a factor, still playing" and "Shoulder: a blocker this Monday". Screen readers must receive the actual meaning, not "disabled". Preserve readable labels and usable focus states even when the illustration itself is subdued.

Examples of optional badge copy: "Dodgy knee", "Temperamental shoulder", "Back with opinions", "Held together, still playing". Final wording should be chosen with the group. Never ridicule a particular player or imply medical advice.

### Profile badges versus this week's participation

Profile badges can persist, but a blocker for a particular Monday is an explicit weekly declaration. Do not silently carry last week's blocker into a new event or infer recovery from time passing.

A player may keep a humorous ailment badge while declaring that it is not a blocker this week. Several factors must not automatically escalate into a blocker.

Selecting "blocker this Monday" must show the consequence clearly and reconcile any existing signup: mark the player unavailable for that event, release a confirmed place if needed, and notify the organizer. If a player subsequently chooses to play, ask them to explicitly change the blocker to a factor or remove the event-specific blocker. Never leave a player both confirmed and blocked.

All of these classifications are the player's own participation decisions, not the app's assessment of whether someone is medically fit to play.

## Group visibility and control

The intended experience is sharing badges of courage inside the Broken Bodies group, not collecting a clinical history. Give players a clear preview and control over what they share. Group-shared badges are visible to authenticated group members, not the public internet.

Existing organizer injury notes must not automatically become published player badges; the player should approve or replace them. Players can change or remove their badges. Detailed diagnoses, treatment histories, medical documents, and dates of birth are not needed for this feature.

Do not present HIPAA certification or medical-privacy messaging as the product experience. Ordinary membership permissions and careful handling of personal information still apply.

## Monday scheduling

- Model the event, time slots, court capacity, responses, confirmations, and waitlist separately.
- "Maybe" and "interested" are not confirmed places.
- Four compatible confirmed players form one doubles group.
- Eight form two groups only when courts and compatible times permit.
- Five to seven should not silently become a complete two-court schedule: the organizer chooses substitutes, waitlists, or an explicit rotation.
- Selecting several acceptable start times expresses flexibility, not multiple bookings.
- No player may be assigned overlapping games.
- Keep organizer approval of final groups in the first version.
- Cancellations and newly declared blockers release places and identify eligible substitutes; notify the organizer when a group drops below four.
- Organizer-entered responses on a player's behalf must be distinguishable from player-entered responses.

## WhatsApp engagement

WhatsApp remains the familiar engagement channel; BB Player/Supabase holds the authoritative signup and scheduling records.

First version:
1. Organizer posts the Friday invitation in the existing WhatsApp group with an event signup link.
2. Players sign in, indicate availability, and optionally update their badges.
3. Organizer reviews responses and approves the final schedule.
4. Organizer shares final arrangements in WhatsApp.
5. Players can cancel through the app; the organizer can also record WhatsApp replies.

Automation can follow after the manual-link flow works. Verify the official WhatsApp integration's supported group/individual messaging, consent, and template requirements before implementation. Do not assume an unofficial personal-account bot is an acceptable integration.

## Initial technology direction

- Cloudroom: development workspace for managed Codex/Pi work.
- GitHub: public `gkedev/mackay` development/demo repository and reviewed delivery workflow; synthetic demo data only, no real player records or credentials.
- Next.js/TypeScript: mobile-first web app, with PWA delivery considered before native apps.
- WorkOS AuthKit: player identity; initially invite-only membership and low-friction email-code login.
- Supabase: application records with membership- and owner-aware Row Level Security.
- Hostinger: isolated application deployment, separate from agent runtimes.
- OpenClaw: optional approved automation outside the login and ordinary request path.
- Separate staging and production credentials, databases, and auth callbacks.

## First implementation slice

Friday invitation link → player login → availability and optional badges → organizer review → final Monday groups → cancellation/substitute handling.

Minimum acceptance cases:
1. A badge-free player marks "Not this week" without entering an injury or reason.
2. A player with three muted factor badges signs up normally.
3. A player selects several acceptable time slots but receives at most one overlapping assignment.
4. A "Maybe" response does not fill a confirmed slot.
5. Selecting an event-specific blocker removes an existing confirmed place and alerts the organizer.
6. Last week's blocker is not silently applied to next week's availability.
7. Muted badges remain interactive and have meaningful accessible labels.
8. Unauthorized/non-member users cannot view the roster or shared badges.
9. Players cannot change another player's availability or badges; authorized organizer-entered scheduling responses are attributable.
10. A player can remove a badge or change its sharing without rewriting historical match results.

## Open decisions

- Initial coding model selection and first Cloud sandbox checkout verification.
- Exact Monday time slots, court availability, and response deadline.
- Selection/waitlist fairness rules and whether rotations are common.
- Which product "Instinct" refers to and whether it adds useful workflow capability.
- Final group-approved badge artwork and wording.
